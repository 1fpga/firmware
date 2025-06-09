use boa_engine::{js_string, Context, JsResult, JsString, Module};
use boa_macros::boa_module;

#[boa_module]
#[boa(rename = "camelCase")]
mod js {
    use boa_engine::JsResult;

    fn shutdown() -> JsResult<()> {
        unsafe {
            // Make sure everything in memory is committed.
            nix::libc::sync();

            #[cfg(target_os = "linux")]
            nix::libc::reboot(nix::libc::RB_POWER_OFF);
        }

        Ok(())
    }

    fn restart() -> JsResult<()> {
        unsafe {
            // Make sure everything in memory is committed.
            nix::libc::sync();

            #[cfg(target_os = "linux")]
            nix::libc::reboot(nix::libc::LINUX_REBOOT_CMD_RESTART);
        }

        Ok(())
    }
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((js_string!("system"), js::boa_module(None, context)))
}
