mod core;
mod db;
mod image;

pub mod classes {
    pub use super::core::JsCore;
    pub use super::db::JsDb;
    pub use super::db::JsDbTransaction;
    pub use super::image::JsImage;
}

pub fn register_globals(context: &mut boa_engine::Context) -> boa_engine::JsResult<()> {
    context.register_global_class::<classes::JsCore>()?;
    context.register_global_class::<classes::JsDb>()?;
    context.register_global_class::<classes::JsDbTransaction>()?;
    context.register_global_class::<classes::JsImage>()?;
    Ok(())
}
