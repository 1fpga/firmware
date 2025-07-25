use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::boa_module;

#[boa_module]
#[boa(rename_all = "camelCase")]
mod js {
    use boa_engine::object::builtins::{JsArrayBuffer, JsPromise};
    use boa_engine::{js_error, Context, JsResult, JsString, JsValue};
    use boa_macros::TryFromJs;
    use std::ops::Deref;
    use tracing::error;

    #[boa(skip)]
    #[derive(TryFromJs)]
    struct IpsPatchOption {}

    fn ips_patch(
        rom: JsArrayBuffer,
        patch: JsArrayBuffer,
        _options: Option<IpsPatchOption>,
        context: &mut Context,
    ) -> JsResult<JsPromise> {
        let mut rom_bytes = rom
            .data_mut()
            .ok_or_else(|| js_error!("Invalid rom ArrayBuffer"))?;
        let ips_bytes = patch
            .data()
            .ok_or_else(|| js_error!("Invalid patch ArrayBuffer"))?;

        let patch = ips::Patch::parse(ips_bytes.deref())
            .map_err(|e| js_error!(JsString::from(e.to_string().as_str())))?;

        for hunk in patch.hunks() {
            let offset = hunk.offset();
            let payload = hunk.payload();
            (&mut *rom_bytes)[offset..offset + payload.len()].copy_from_slice(payload);
        }

        if let Some(_truncation) = patch.truncation() {
            // TODO: support truncation.
            // rom_bytes.truncate(truncation);
            error!("Truncation is not supported yet.");
        }

        Ok(JsPromise::resolve(JsValue::undefined(), context))
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("utils"), js::boa_module(None, context)))
}
