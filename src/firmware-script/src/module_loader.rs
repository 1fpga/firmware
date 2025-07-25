use std::cell::RefCell;
use std::path::PathBuf;
use std::rc::Rc;

use boa_engine::module::{ModuleLoader, Referrer, SimpleModuleLoader};
use boa_engine::{Context, JsResult, JsString, Module};
use boa_interop::embed_module;
use boa_interop::loaders::HashMapModuleLoader;
use boa_interop::loaders::embedded::EmbeddedModuleLoader;

fn create_root_dirs() -> Result<(), std::io::Error> {
    std::fs::create_dir_all("/media/fat/1fpga/scripts/")?;
    std::fs::create_dir_all("/media/fat/1fpga/plugins/")?;
    Ok(())
}

/// A module loader that also understands "freestanding" modules and
/// special resolution.
pub struct OneFpgaModuleLoader {
    named_modules: RefCell<Rc<HashMapModuleLoader>>,
    embedded: Rc<EmbeddedModuleLoader>,
    root: Option<Rc<SimpleModuleLoader>>,

    #[allow(unused)]
    scripts: Rc<SimpleModuleLoader>,
    #[allow(unused)]
    plugins: Rc<SimpleModuleLoader>,
}

impl Default for OneFpgaModuleLoader {
    fn default() -> Self {
        let _ = create_root_dirs();

        Self {
            named_modules: RefCell::new(Rc::new(HashMapModuleLoader::default())),
            embedded: Rc::new(embed_module!("../../js/frontend/dist/")),
            root: None,
            scripts: Rc::new(SimpleModuleLoader::new("/media/fat/1fpga/scripts/").unwrap()),
            plugins: Rc::new(SimpleModuleLoader::new("/media/fat/1fpga/plugins/").unwrap()),
        }
    }
}

impl OneFpgaModuleLoader {
    fn new_unchecked(root: PathBuf) -> Self {
        let _ = create_root_dirs();

        Self {
            named_modules: RefCell::new(Rc::new(HashMapModuleLoader::default())),
            embedded: Rc::new(EmbeddedModuleLoader::from_iter(vec![])),
            root: Some(Rc::new(
                SimpleModuleLoader::new(root).expect("Could not find the script folder."),
            )),
            scripts: Rc::new(SimpleModuleLoader::new("/media/fat/1fpga/scripts/").unwrap()),
            plugins: Rc::new(SimpleModuleLoader::new("/media/fat/1fpga/plugins/").unwrap()),
        }
    }

    /// Creates a new `ModuleLoader` from a root module path.
    pub fn new(root: impl Into<PathBuf>) -> Result<Self, std::io::Error> {
        root.into().canonicalize().map(Self::new_unchecked)
    }

    /// Inserts a module in the named module map.
    #[inline]
    pub fn insert_named(&self, name: JsString, module: Module) {
        self.named_modules.borrow_mut().register(name, module);
    }
}

impl ModuleLoader for OneFpgaModuleLoader {
    async fn load_imported_module(
        self: Rc<Self>,
        referrer: Referrer,
        specifier: JsString,
        context: &RefCell<&mut Context>,
    ) -> JsResult<Module> {
        if let Ok(module) = self
            .named_modules
            .borrow()
            .clone()
            .load_imported_module(referrer.clone(), specifier.clone(), context)
            .await
        {
            Ok(module)
        } else if let Some(ref root_loader) = self.root {
            // If there is a root_loader, completely ignore the embedded module.
            root_loader
                .clone()
                .load_imported_module(referrer.clone(), specifier.clone(), context)
                .await
        } else {
            self.embedded
                .clone()
                .load_imported_module(referrer, specifier, context)
                .await
        }
    }
}
