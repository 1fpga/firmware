use boa_engine::value::TryIntoJs;
use boa_engine::{js_string, Context, JsResult, JsString, JsValue, Module, TryIntoJsResult};
use boa_macros::{boa_module, Finalize, Trace};
use liboptic_edid::structures::id::{Date, Manufacturer};
use liboptic_edid::structures::std_timings::{STiming, StandardAspectRatio};
use std::os::fd::AsRawFd;

nix::ioctl_write_int_bad!(vt_activate, 22022);
nix::ioctl_write_int_bad!(vt_waitactive, 22023);

fn switch_to_vt(n: u8) -> Result<(), String> {
    let tty = std::fs::File::open("/dev/tty0").map_err(|s| s.to_string())?;
    let fd = tty.as_raw_fd();

    unsafe { vt_activate(fd, n.into()).map_err(|s| s.to_string())? };
    unsafe { vt_waitactive(fd, n.into()).map_err(|s| s.to_string())? };
    Ok(())
}

#[derive(Debug, Clone, Trace, Finalize, TryIntoJs)]
#[boa(rename_all = "camelCase")]
struct StandardTiming {
    pub vertical_addr_pixel_ct: u16,
    pub horizontal_addr_pixel_ct: u16,
    pub aspect_ratio: String,
    pub field_refresh_rate: u8,
}

impl From<STiming> for StandardTiming {
    fn from(value: STiming) -> Self {
        let h = value.horizontal_addr_pixel_ct;
        Self {
            horizontal_addr_pixel_ct: h,
            aspect_ratio: match value.aspect_ratio {
                StandardAspectRatio::_16_10 => "16x10".to_string(),
                StandardAspectRatio::_4_3 => "4x3".to_string(),
                StandardAspectRatio::_5_4 => "5x4".to_string(),
                StandardAspectRatio::_16_9 => "16x9".to_string(),
            },
            vertical_addr_pixel_ct: match value.aspect_ratio {
                StandardAspectRatio::_16_10 => h * 10 / 16,
                StandardAspectRatio::_4_3 => h * 3 / 4,
                StandardAspectRatio::_5_4 => h * 4 / 5,
                StandardAspectRatio::_16_9 => h * 9 / 16,
            },
            field_refresh_rate: value.field_refresh_rate,
        }
    }
}

#[derive(Debug, Clone, Trace, Finalize, TryIntoJs)]
#[boa(rename_all = "camelCase")]
struct VendorProductId {
    manufacturer: String,
    product_code: u16,
    serial_number: Option<u32>,
    date: String,
}

#[derive(Debug, Clone, Trace, Finalize, TryIntoJs)]
#[boa(rename_all = "camelCase")]
struct Edid {
    vendor_product_info: VendorProductId,
    version: String,
    standard_timings: Vec<StandardTiming>,
}

impl From<liboptic_edid::Edid> for Edid {
    fn from(value: liboptic_edid::Edid) -> Self {
        Self {
            vendor_product_info: VendorProductId {
                manufacturer: match value.vendor_product_info.manufacturer_name {
                    Manufacturer::Name(m) => m.to_string(),
                    Manufacturer::Id(id) => id.to_string(),
                },
                product_code: value.vendor_product_info.product_code,
                serial_number: value.vendor_product_info.serial_number,
                date: match value.vendor_product_info.date {
                    Date::Manufacture { week, year } => {
                        format!("{year:04}-{:02}", week.unwrap_or(0))
                    }
                    Date::ModelYear(year) => format!("{:04}", year),
                },
            },
            version: format!("{}.{}", value.version.version, value.version.revision),
            standard_timings: vec![
                value.standard_timings.st1,
                value.standard_timings.st2,
                value.standard_timings.st3,
                value.standard_timings.st4,
                value.standard_timings.st5,
                value.standard_timings.st6,
                value.standard_timings.st7,
                value.standard_timings.st8,
            ]
            .into_iter()
            .filter(|e| e.is_some())
            .flatten()
            .map(Into::into)
            .collect(),
        }
    }
}

impl TryIntoJsResult for Edid {
    fn try_into_js_result(self, context: &mut Context) -> JsResult<JsValue> {
        self.try_into_js(context)
    }
}

#[boa_module]
mod js {
    use crate::AppRef;
    use boa_engine::value::TryIntoJs;
    use boa_engine::{js_error, Context, JsError, JsResult, JsString, JsValue};
    use boa_interop::ContextData;
    use firmware_gui::{EventState, Hooks};
    use mister_fpga::core::video::edid::{get_edid, DefaultVideoMode};
    use mister_fpga::core::AsMisterCore;
    use mister_fpga::fpga::user_io::SetFramebufferToHpsOutput;
    use mister_fpga_ini::resolution;
    use std::str::FromStr;
    use tracing::{debug, info};

    fn read_edid() -> JsResult<Option<super::Edid>> {
        let edid = get_edid().map_err(|e| js_error!("Could not read EDID: {}", e))?;
        debug!(?edid, "EDID");
        let edid: Option<super::Edid> = edid.map(Into::into);

        Ok(edid)
    }

    fn set_mode(mode: String, ContextData(mut app): ContextData<AppRef>) -> JsResult<()> {
        let mut core = app.platform_mut().core_manager_mut().get_current_core();

        let core = match core.as_mut().map(|c| c.as_mister_core_mut()) {
            Some(Some(core)) => Some(core),
            None => None,
            Some(None) => match core.as_mut().map(|c| c.as_menu_core_mut()) {
                Some(Some(menu)) => Some(menu.inner()),
                Some(None) => {
                    return Err(js_error!("Core is not a MisterFpgaCore"));
                }
                None => unreachable!(),
            },
        };

        debug!(mode, "Video mode requested");
        let video_mode = DefaultVideoMode::from_str(&mode).map_err(JsError::from_rust)?;

        info!(?video_mode, "Setting video mode");
        mister_fpga::core::video::select_mode(
            video_mode.into(),
            false,
            None,
            None,
            core.map(|c| c.spi()),
            true,
        )
        .map_err(|e| JsError::from_opaque(JsString::from(e.to_string()).into()))?;
        Ok(())
    }

    #[boa(skip)]
    #[derive(Debug, TryIntoJs)]
    pub struct Resolution {
        width: u64,
        height: u64,
    }

    #[boa(skip)]
    impl From<resolution::Resolution> for Resolution {
        fn from(value: resolution::Resolution) -> Self {
            Self {
                width: value.width as u64,
                height: value.height as u64,
            }
        }
    }

    fn get_resolution(
        ContextData(mut app): ContextData<AppRef>,
        context: &mut Context,
    ) -> JsResult<Option<JsValue>> {
        let mut core = app
            .platform_mut()
            .core_manager_mut()
            .get_current_core()
            .ok_or_else(|| js_error!("No core loaded"))?;

        let Some(core) = core.as_menu_core_mut() else {
            return Ok(None);
        };

        let video_info = core
            .video_info()
            .map_err(|e| js_error!("Failed to get video info: {}", e))?;

        let resolution = video_info.fb_resolution();
        Ok(Some(Resolution::from(resolution).try_into_js(context)?))
    }

    fn switch_to_core(ContextData(mut app): ContextData<AppRef>) -> JsResult<()> {
        if let Some(mut core) = app.platform_mut().core_manager_mut().get_current_core() {
            if let Some(menu) = core.as_menu_core_mut() {
                let mut spi = menu.inner().spi_mut();

                spi.execute(SetFramebufferToHpsOutput {
                    n: 1,
                    height: 640,
                    width: 480,
                    hact: 640,
                    vact: 480,
                    x_offset: 0,
                    y_offset: 0,
                })
                .expect("Uh...");
            }
        }

        super::switch_to_vt(0).map_err(|s| JsError::from_opaque(JsString::from(s).into()))
    }

    fn switch_to_term(ContextData(mut app): ContextData<AppRef>) -> JsResult<()> {
        app.platform_mut().core_manager_mut().hide_osd();
        if let Some(mut core) = app.platform_mut().core_manager_mut().get_current_core() {
            if let Some(menu) = core.as_menu_core_mut() {
                let mister_core = menu.inner();
                let mut spi = mister_core.spi_mut();

                let vinfo = mister_fpga::core::video::VideoInfo::create(spi)
                    .map_err(|e| JsError::from_opaque(JsString::from(e).into()))?;
                info!(?vinfo, "vinfo");

                spi.execute(SetFramebufferToHpsOutput {
                    n: 0,
                    height: 480,
                    width: 640,
                    vact: 480,
                    hact: 640,
                    x_offset: 0,
                    y_offset: 0,
                })
                .expect("Uh...");

                let vinfo = mister_fpga::core::video::VideoInfo::create(spi);
                info!(?vinfo, "vinfo 2");

                let mut bits = *mister_core.read_status_bits();
                bits.set_range(5..8, 0x160);
                mister_core.send_status_bits(bits);
            }
        }

        super::switch_to_vt(1).map_err(|s| JsError::from_opaque(JsString::from(s).into()))
    }

    fn run() -> JsResult<()> {
        struct GuiHooks;
        impl Hooks for GuiHooks {
            fn key_down(
                &self,
                key: firmware_gui::events::Key,
                state: &mut EventState,
            ) -> Result<(), String> {
                todo!()
            }
        }

        firmware_gui::r#loop(GuiHooks).map_err(|s| JsError::from_opaque(JsString::from(s).into()))
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("video"), js::boa_module(None, context)))
}
