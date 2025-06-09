use boa_engine::object::builtins::JsFunction;
use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::{boa_module, Finalize, JsData, Trace};
use firmware_ui::input::commands::CommandId;
use std::collections::HashMap;
use std::sync::atomic::AtomicUsize;

#[derive(Default, Trace, Finalize, JsData)]
pub struct CommandMap {
    #[unsafe_ignore_trace]
    inner: HashMap<CommandId, JsFunction>,

    #[unsafe_ignore_trace]
    next_id: AtomicUsize,
}

impl CommandMap {
    pub fn next_id(&self) -> CommandId {
        CommandId::from_id(
            self.next_id
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed),
        )
    }

    pub fn get(&self, id: CommandId) -> Option<&JsFunction> {
        self.inner.get(&id)
    }

    pub fn insert(&mut self, id: CommandId, shortcut: JsFunction) {
        self.inner.insert(id, shortcut);
    }

    pub fn remove(&mut self, id: &CommandId) -> Option<JsFunction> {
        self.inner.remove(id)
    }
}

#[boa_module]
#[boa(rename = "camelCase")]
mod js {
    use crate::HostData;
    use boa_engine::interop::ContextData;
    use boa_engine::object::builtins::JsFunction;
    use boa_engine::{js_error, JsResult};
    use firmware_ui::input::shortcut::Shortcut;
    use std::str::FromStr;
    use tracing::debug;

    fn create_shortcut(
        ContextData(data): ContextData<HostData>,
        shortcut: String,
        action: JsFunction,
    ) -> JsResult<()> {
        debug!(?shortcut, "Creating shortcut");
        let shortcut =
            Shortcut::from_str(&shortcut).map_err(|e| js_error!("Invalid shortcut: {:?}", e))?;

        let app = data.app_mut();
        let command_map = data.command_map_mut();
        let id = command_map.next_id();
        command_map.insert(id, action);
        app.add_shortcut(shortcut, id);

        Ok(())
    }

    fn remove_shortcut(ContextData(data): ContextData<HostData>, shortcut: String) -> JsResult<()> {
        debug!(?shortcut, "Removing shortcut");
        let shortcut =
            Shortcut::from_str(&shortcut).map_err(|e| js_error!("Invalid shortcut: {:?}", e))?;

        let app = data.app_mut();
        let command_map = data.command_map_mut();

        if let Some(command_id) = app.remove_shortcut(&shortcut) {
            command_map.remove(&command_id);
        }

        Ok(())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("commands"), js::boa_module(None, context)))
}
