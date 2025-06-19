use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::boa_module;

#[boa_module]
#[boa(rename = "camelCase")]
mod js {
    use crate::modules::JsCore;
    use crate::HostData;
    use boa_engine::class::Class;
    use boa_engine::interop::ContextData;
    use boa_engine::value::TryFromJs;
    use boa_engine::{js_error, Context, JsError};
    use boa_engine::{JsResult, JsValue};
    use boa_macros::{Finalize, JsData, Trace};
    use one_fpga::core::Rom;
    use one_fpga::runner::CoreLaunchInfo;
    use serde::Deserialize;
    use std::path::PathBuf;
    use tracing::info;

    /// The core type from JavaScript.
    #[boa(skip)]
    #[derive(Debug, Trace, Finalize, JsData, Deserialize)]
    #[serde(tag = "type")]
    enum CoreType {
        Path { path: String },
    }

    /// The game type for JavaScript.
    #[boa(skip)]
    #[derive(Debug, Trace, Finalize, JsData, Deserialize)]
    #[serde(tag = "type")]
    enum GameType {
        RomPath { path: String },
    }

    #[boa(skip)]
    #[derive(Debug, Trace, Finalize, JsData, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RunOptions {
        core: CoreType,
        game: Option<GameType>,
        files: Option<Vec<Option<String>>>,
        savestate: Option<String>,
        show_menu: Option<bool>,
    }

    #[boa(skip)]
    impl TryFromJs for RunOptions {
        fn try_from_js(value: &JsValue, context: &mut Context) -> JsResult<Self> {
            let Some(value) = value.to_json(context)? else {
                return Err(js_error!("Expected options, got undefined."));
            };

            serde_json::from_value(value).map_err(JsError::from_rust)
        }
    }

    fn load(
        options: RunOptions,
        host_data: ContextData<HostData>,
        context: &mut Context,
    ) -> JsResult<JsValue> {
        let app = host_data.0.app_mut();
        let mut core_options = match &options.core {
            CoreType::Path { path } => CoreLaunchInfo::rbf(PathBuf::from(path)),
        };

        match &options.game {
            Some(GameType::RomPath { path }) => {
                core_options = core_options.with_rom(Rom::File(PathBuf::from(path)));
            }
            None => {}
        };

        if let Some(files) = &options.files {
            for (i, file) in files
                .iter()
                .enumerate()
                .filter_map(|(i, x)| x.as_ref().map(|x| (i, x)))
            {
                core_options
                    .files
                    .insert(i, one_fpga::runner::Slot::File(PathBuf::from(file)));
            }
        }

        info!("Launching core: {:?}", core_options);
        let core = app
            .platform_mut()
            .core_manager_mut()
            .launch(core_options)
            .unwrap();

        Ok(JsCore::from_data(JsCore::new(core), context)?.into())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("core"), js::boa_module(None, context)))
}
