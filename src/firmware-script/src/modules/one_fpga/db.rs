use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::boa_module;

#[boa_module]
#[boa(rename = "camelCase")]
mod db {
    use crate::modules::one_fpga::globals::classes::JsDb;
    use boa_engine::class::Class;
    use boa_engine::{Context, Finalize, JsObject, JsResult, JsString, Trace};
    use boa_macros::TryFromJs;

    #[boa(skip)]
    #[derive(Debug, TryFromJs, Finalize, Trace)]
    struct LoadOptions {
        migrations: Option<JsString>,
    }

    fn load(
        name: JsString,
        _options: Option<LoadOptions>,
        context: &mut Context,
    ) -> JsResult<JsObject> {
        JsDb::from_data(JsDb::new(name.to_std_string_lossy())?, context)
    }

    fn load_path(path: JsString, context: &mut Context) -> JsResult<JsObject> {
        JsDb::from_data(JsDb::load_file(path.to_std_string_lossy())?, context)
    }

    fn reset(name: JsString) -> JsResult<()> {
        JsDb::reset(name.to_std_string_lossy())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("db"), db::boa_module(None, context)))
}
