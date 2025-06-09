use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::boa_module;

#[boa_module]
#[boa(rename = "camelCase")]
mod js {
    use crate::HostData;
    use boa_engine::interop::ContextData;
    use boa_engine::{JsError, JsResult, JsString};

    fn load_mapping(ContextData(data): ContextData<HostData>, mapping: JsString) -> JsResult<()> {
        let app = data.app_mut();

        let mapping = mapping.to_std_string_lossy();
        let mapping = mapping.as_str();

        app.platform_mut()
            .platform
            .gamepad
            .borrow_mut()
            .add_mapping(mapping)
            .map_err(JsError::from_rust)?;

        Ok(())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("controllers"), js::boa_module(None, context)))
}
