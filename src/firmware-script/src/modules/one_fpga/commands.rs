use boa_engine::object::builtins::JsFunction;
use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::{boa_module, Finalize, JsData, Trace};
use firmware_ui::input::commands::CommandId;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::atomic::AtomicUsize;

#[derive(Trace, Finalize, JsData, Clone)]
pub struct CommandMap {
    #[unsafe_ignore_trace]
    inner: Rc<RefCell<HashMap<CommandId, JsFunction>>>,

    #[unsafe_ignore_trace]
    next_id: Rc<AtomicUsize>,
}

impl Default for CommandMap {
    fn default() -> Self {
        Self {
            inner: Rc::new(RefCell::new(HashMap::new())),
            next_id: Rc::new(AtomicUsize::new(0)),
        }
    }
}

impl CommandMap {
    pub fn next_id(&self) -> CommandId {
        CommandId::from_id(
            self.next_id
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed),
        )
    }

    pub fn get(&self, id: CommandId) -> Option<JsFunction> {
        self.inner.borrow().get(&id).cloned()
    }

    pub fn insert(&self, id: CommandId, shortcut: JsFunction) {
        self.inner.borrow_mut().insert(id, shortcut);
    }

    pub fn remove(&self, id: &CommandId) -> Option<JsFunction> {
        self.inner.borrow_mut().remove(id)
    }
}

#[boa_module]
#[boa(rename = "camelCase")]
mod js {
    use crate::modules::CommandMap;
    use crate::AppRef;
    use boa_engine::interop::ContextData;
    use boa_engine::object::builtins::JsFunction;
    use boa_engine::{js_error, JsResult};
    use firmware_ui::input::shortcut::Shortcut;
    use std::str::FromStr;
    use tracing::debug;

    fn create_shortcut(
        ContextData(app): ContextData<AppRef>,
        ContextData(command_map): ContextData<CommandMap>,
        shortcut: String,
        action: JsFunction,
    ) -> JsResult<()> {
        debug!(?shortcut, "Creating shortcut");
        let shortcut =
            Shortcut::from_str(&shortcut).map_err(|e| js_error!("Invalid shortcut: {:?}", e))?;

        let id = command_map.next_id();
        command_map.insert(id, action);
        app.add_shortcut(shortcut, id);

        Ok(())
    }

    fn remove_shortcut(
        ContextData(app): ContextData<AppRef>,
        ContextData(command_map): ContextData<CommandMap>,
        shortcut: String,
    ) -> JsResult<()> {
        debug!(?shortcut, "Removing shortcut");
        let shortcut =
            Shortcut::from_str(&shortcut).map_err(|e| js_error!("Invalid shortcut: {:?}", e))?;

        if let Some(command_id) = app.remove_shortcut(&shortcut) {
            command_map.remove(&command_id);
        }

        Ok(())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("commands"), js::boa_module(None, context)))
}
