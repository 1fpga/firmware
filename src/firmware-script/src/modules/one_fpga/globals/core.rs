use crate::commands::maybe_call_command;
use crate::modules::one_fpga::globals::classes::JsImage;
use crate::modules::CommandMap;
use crate::AppRef;
use boa_engine::class::Class;
use boa_engine::object::builtins::{JsFunction, JsPromise, JsUint8Array};
use boa_engine::value::TryFromJs;
use boa_engine::{js_error, Context, JsError, JsResult, JsString, JsValue, TryIntoJsResult};
use boa_interop::{ContextData, JsClass};
use boa_macros::{boa_class, Finalize, JsData, Trace};
use enum_map::{Enum, EnumMap};
use firmware_ui::application::panels::core_loop::run_core_loop;
use mister_fpga::core::{AsMisterCore, MisterFpgaCore};
use one_fpga::core::SettingId;
use one_fpga::{Core, OneFpgaCore};
use std::cell::RefCell;
use std::rc::Rc;
use std::str::FromStr;
use tracing::{error, info};

#[derive(Debug, Clone, Trace, Finalize, TryFromJs)]
struct LoopOptions {}

#[derive(Debug, Clone, Enum, strum::EnumString, strum::EnumIter, strum::Display)]
#[strum(serialize_all = "camelCase")]
enum Events {
    /// Fired when the core should save its savestate.
    SaveState,
    /// Called when the core exits.
    Quit,
}

impl TryFromJs for Events {
    fn try_from_js(value: &JsValue, context: &mut Context) -> JsResult<Self> {
        let string = JsString::try_from_js(value, context)?;
        Self::from_str(string.to_std_string_lossy().as_str()).map_err(
            |_e| js_error!(TypeError: "Unknown event type: {}", string.to_std_string_escaped()),
        )
    }
}

#[derive(Clone, Trace, Finalize, JsData)]
pub struct JsCore {
    #[unsafe_ignore_trace]
    core: OneFpgaCore,

    #[unsafe_ignore_trace]
    events: Rc<RefCell<EnumMap<Events, Vec<JsFunction>>>>,
}

impl JsCore {
    pub fn new(core: OneFpgaCore) -> Self {
        Self {
            core,
            events: Default::default(),
        }
    }
}

#[boa_class(rename = "OneFpgaCore")]
#[boa(rename_all = "camelCase")]
impl JsCore {
    #[boa(constructor)]
    fn constructor(ContextData(mut app): ContextData<AppRef>) -> JsResult<Self> {
        let core = app
            .platform_mut()
            .core_manager_mut()
            .get_current_core()
            .unwrap()
            .clone();

        Ok(Self::new(core))
    }

    #[boa(getter)]
    fn name(&self) -> JsString {
        JsString::from(self.core.name())
    }

    #[boa(getter)]
    fn settings(&self, context: &mut Context) -> JsResult<JsValue> {
        let settings = self.core.settings().map_err(JsError::from_rust)?;
        let json = serde_json::to_value(&settings).map_err(JsError::from_rust)?;
        JsValue::from_json(&json, context).map_err(JsError::from_rust)
    }

    #[boa(getter)]
    fn status_bits(&self, context: &mut Context) -> Option<JsUint8Array> {
        if let Some(core) = self.core.as_mister_core() {
            JsUint8Array::from_iter(
                core.status_bits().iter().map(|b| if b { 1 } else { 0 }),
                context,
            )
            .ok()
        } else {
            None
        }
    }

    #[boa(setter)]
    #[boa(rename = "statusBits")]
    fn set_status_bits(
        this: JsClass<JsCore>,
        bits: JsUint8Array,
        context: &mut Context,
    ) -> JsResult<()> {
        if let Some(core) = this.borrow().core.as_mister_core() {
            let mut slice = *core.status_bits();
            for bit in 0..slice.len() {
                slice.set(bit, bits.at(bit as i64, context)?.to_uint8(context)? != 0);
            }
        }
        Ok(())
    }

    #[boa(getter)]
    fn volume(&self) -> JsResult<f64> {
        Ok(self.core.volume().map_err(JsError::from_rust)? as f64 / 255.0)
    }

    #[boa(setter)]
    #[boa(rename = "volume")]
    fn set_volume(&mut self, volume: f64) -> JsResult<()> {
        let value = (volume * 255.0) as u8;
        self.core.set_volume(value).map_err(JsError::from_rust)
    }

    fn reset(&mut self) -> JsResult<()> {
        self.core.reset().map_err(JsError::from_rust)
    }

    #[boa(rename = "loop")]
    #[boa(method)]
    fn run_loop(
        this: JsClass<JsCore>,
        ContextData(command_map): ContextData<CommandMap>,
        ContextData(mut app): ContextData<AppRef>,
        options: Option<LoopOptions>,
        context: &mut Context,
    ) -> JsResult<JsPromise> {
        let mut core = this.borrow().core.clone();

        let events = this.borrow().events.clone();
        info!("Running loop: {:?}", options);

        let cx = RefCell::new(context);

        let result = run_core_loop(
            &mut app,
            &mut core,
            |app, _core, id| -> JsResult<()> {
                maybe_call_command(app, id, &command_map, *cx.borrow_mut())
            },
            |_app, _core, screenshot, slot, savestate| {
                for handler in events.borrow()[Events::SaveState].iter() {
                    let ss = JsUint8Array::from_iter(savestate.iter().copied(), *cx.borrow_mut())?;
                    let image = screenshot.and_then(|i| {
                        JsImage::from_data(JsImage::new(i.clone()), *cx.borrow_mut()).ok()
                    });
                    let result = handler.call(
                        &JsValue::undefined(),
                        &[
                            ss.into(),
                            image.map(JsValue::from).unwrap_or(JsValue::undefined()),
                            JsValue::from(slot),
                        ],
                        *cx.borrow_mut(),
                    )?;

                    if let Some(p) = result.as_promise() {
                        p.await_blocking(*cx.borrow_mut())?;
                    }
                }

                Ok(())
            },
        );

        let js_result = result
            .clone()
            .try_into_js_result(*cx.borrow_mut())
            .unwrap_or_else(|e| {
                error!(?e, "Error converting result to JS");
                JsValue::undefined()
            });
        events.borrow()[Events::Quit].iter().for_each(|f| {
            let _ = f.call(
                &JsValue::undefined(),
                &[js_result.clone()],
                *cx.borrow_mut(),
            );
        });

        result.map(|_| JsPromise::resolve(JsValue::undefined(), *cx.borrow_mut()))
    }

    fn show_osd(
        this: JsClass<JsCore>,
        ContextData(mut app): ContextData<AppRef>,
        handler: JsFunction,
        context: &mut Context,
    ) -> JsResult<()> {
        app.platform_mut().core_manager_mut().show_osd();

        // Update saves on Mister Cores.
        let mut core = this.borrow().core.clone();

        if let Some(c) = core.as_any_mut().downcast_mut::<MisterFpgaCore>() {
            loop {
                match c.poll_mounts() {
                    Ok(true) => {}
                    Ok(false) => break,
                    Err(e) => {
                        error!(?e, "Error updating the SD card.");
                        break;
                    }
                }
            }
        }

        let mut v = handler.call(&JsValue::undefined(), &[], context)?;
        if let Some(p) = v.as_promise() {
            v = p.await_blocking(context)?;
        }

        if v.to_boolean() {
            this.borrow_mut().quit();
        }

        app.platform_mut().core_manager_mut().hide_osd();
        Ok(())
    }

    fn quit(&mut self) {
        self.core.quit();
    }

    fn on(&mut self, event: Events, handler: JsFunction) -> JsResult<()> {
        self.events.borrow_mut()[event].push(handler);
        Ok(())
    }

    fn screenshot(&self, context: &mut Context) -> JsResult<JsPromise> {
        let screenshot = self.core.screenshot().map_err(JsError::from_rust)?;
        let image = JsImage::from_data(JsImage::new(screenshot), context)?;
        Ok(JsPromise::resolve(image, context))
    }

    fn file_select(&mut self, id: u32, path: JsString) -> JsResult<()> {
        self.core
            .file_select(SettingId::from(id), path.to_std_string_lossy())
            .map_err(JsError::from_rust)
    }

    fn trigger(&mut self, id: u32) -> JsResult<()> {
        self.core
            .trigger(SettingId::from(id))
            .map_err(JsError::from_rust)
    }

    fn bool_select(&mut self, id: u32, value: bool) -> JsResult<bool> {
        self.core
            .bool_option(SettingId::from(id), value)
            .map_err(JsError::from_rust)
    }

    fn int_select(&mut self, id: u32, value: u32) -> JsResult<u32> {
        self.core
            .int_option(SettingId::from(id), value)
            .map_err(JsError::from_rust)
    }
}
