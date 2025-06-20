use boa_engine::value::TryIntoJs;
use boa_engine::{js_string, Context, JsResult, JsString, JsValue, Module, TryIntoJsResult};
use boa_macros::{boa_module, Finalize, Trace};
use liboptic_edid::structures::id::{Date, Manufacturer};
use liboptic_edid::structures::std_timings::{STiming, StandardAspectRatio};

#[derive(Debug, Clone, Trace, Finalize, TryIntoJs)]
#[boa(rename = "camelCase")]
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
#[boa(rename = "camelCase")]
struct VendorProductId {
    manufacturer: String,
    product_code: u16,
    serial_number: Option<u32>,
    date: String,
}

#[derive(Debug, Clone, Trace, Finalize, TryIntoJs)]
#[boa(rename = "camelCase")]
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
#[boa(rename = "camelCase")]
mod js {
    use crate::AppRef;
    use boa_engine::value::TryIntoJs;
    use boa_engine::{js_error, Context, JsError, JsResult, JsString, JsValue};
    use boa_interop::ContextData;
    use mister_fpga::core::video::edid::{get_edid, DefaultVideoMode};
    use mister_fpga::core::AsMisterCore;
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
        let mut core = app
            .platform_mut()
            .core_manager_mut()
            .get_current_core()
            .ok_or_else(|| js_error!("No core loaded"))?;

        let core = match core.as_mister_core_mut() {
            Some(core) => core,
            None => match core.as_menu_core_mut() {
                Some(menu) => menu.inner(),
                None => {
                    return Err(js_error!("Core is not a MisterFpgaCore"));
                }
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
            core.spi_mut(),
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
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("video"), js::boa_module(None, context)))
}
