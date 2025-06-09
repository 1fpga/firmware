use crate::HostData;
use boa_engine::class::Class;
use boa_engine::object::builtins::JsPromise;
use boa_engine::value::TryFromJs;
use boa_engine::{js_error, Context, JsObject, JsResult, JsString, JsValue};
use boa_interop::ContextData;
use boa_macros::{boa_class, js_str, Finalize, JsData, Trace};
use image::DynamicImage;
use mister_fpga::core::AsMisterCore;
use std::rc::Rc;
use tracing::{debug, error};

/// Position of the image.
#[derive(Debug, Default, Clone, Copy)]
pub enum Position {
    /// Top-left corner.
    #[default]
    TopLeft,

    /// Centered.
    Center,

    /// Specific position.
    Custom { x: i64, y: i64 },
}

impl TryFromJs for Position {
    fn try_from_js(value: &JsValue, context: &mut Context) -> JsResult<Self> {
        if value.is_null_or_undefined() {
            Ok(Self::default())
        } else if let Some(v) = value.as_object() {
            let x = v.get(js_str!("x"), context)?;
            let y = v.get(js_str!("y"), context)?;

            Ok(Self::Custom {
                x: x.to_number(context)? as i64,
                y: y.to_number(context)? as i64,
            })
        } else {
            let s = value
                .to_string(context)?
                .to_std_string_lossy()
                .to_lowercase();

            Ok(match s.as_str() {
                "top-left" => Self::TopLeft,
                "center" => Self::Center,
                _ => return Err(js_error!("Invalid position")),
            })
        }
    }
}

/// Options for the sendToBackground method.
#[derive(Debug, Clone, Copy, TryFromJs)]
pub struct SendToBackgroundOptions {
    /// Clear the background first. Default to false.
    clear: Option<bool>,

    /// Position of the image.
    position: Option<Position>,
}

/// An image.
#[derive(Clone, Trace, Finalize, JsData)]
pub struct JsImage {
    #[unsafe_ignore_trace]
    inner: Rc<DynamicImage>,
}

impl JsImage {
    /// Create a new `JsImage`.
    pub fn new(inner: DynamicImage) -> Self {
        Self {
            inner: Rc::new(inner),
        }
    }

    /**
     * Load an image from the embedded resources, by its name.
     */
    pub fn load_embedded(name: &str) -> JsResult<JsImage> {
        match name {
            "background" => {
                let image =
                    image::load_from_memory(include_bytes!("../../../../assets/background.jpg"))
                        .map_err(|e| js_error!("Failed to load embedded image: {}", e))?;
                Ok(Self::new(image))
            }
            _ => Err(js_error!("Unknown embedded image.")),
        }
    }
}

#[boa_class(name = "Image")]
#[boa(rename = "camelCase")]
impl JsImage {
    #[boa(static)]
    pub fn load(path: JsString, context: &mut Context) -> JsResult<JsObject> {
        let image = image::open(
            path.to_std_string()
                .map_err(|_| js_error!("Invalid path."))?
                .as_str(),
        )
        .map_err(|e| js_error!("Failed to load image: {}", e))?;

        Self::from_data(Self::new(image), context)
    }

    #[boa(static)]
    pub fn embedded(name: String, context: &mut Context) -> JsResult<JsObject> {
        Self::from_data(Self::load_embedded(name.as_str())?, context)
    }

    #[boa(constructor)]
    fn js_new() -> JsResult<Self> {
        Err(js_error!("Cannot construct Image."))
    }

    /// Get the width of the image.
    #[boa(getter)]
    pub fn width(&self) -> u32 {
        self.inner.width()
    }

    /// Get the height of the image.
    #[boa(getter)]
    pub fn height(&self) -> u32 {
        self.inner.height()
    }

    /// Resize the image, returning a new image.
    pub fn resize(
        &self,
        width: u32,
        height: u32,
        keep_aspect_ratio: Option<bool>,
        context: &mut Context,
    ) -> JsResult<JsObject> {
        let this = Self::new(if keep_aspect_ratio.unwrap_or(true) {
            self.inner
                .resize(width, height, image::imageops::FilterType::Nearest)
        } else {
            self.inner
                .resize_exact(width, height, image::imageops::FilterType::Nearest)
        });

        Self::from_data(this, context)
    }

    /// Save the image
    pub fn save(&self, path: String, context: &mut Context) -> JsResult<JsPromise> {
        debug!("Save image to {}", path);
        let inner = self.inner.clone();
        let promise = JsPromise::new(
            |fns, context| match inner.save(path) {
                Ok(()) => fns.resolve.call(&JsValue::null(), &[], context),
                Err(e) => fns.reject.call(
                    &JsValue::null(),
                    &[js_error!("Failed to save image: {}", e).to_opaque(context)],
                    context,
                ),
            },
            context,
        );

        Ok(promise)
    }

    /// Put the image as the background, if on the menu core.
    #[boa(name = "sendToBackground")]
    fn send_to_background(
        &self,
        host_data: ContextData<HostData>,
        options: Option<SendToBackgroundOptions>,
    ) {
        let app = host_data.0.app_mut();
        let Some(mut maybe_core) = app.platform_mut().core_manager_mut().get_current_core() else {
            return;
        };

        let Some(maybe_menu) = maybe_core.as_menu_core_mut() else {
            return;
        };

        let Ok(fb_size) = maybe_menu.video_info().map(|info| info.fb_resolution()) else {
            return;
        };

        let image = self.inner.as_ref();
        let position = options.and_then(|o| o.position).unwrap_or_default();
        let clear = options.and_then(|o| o.clear).unwrap_or(false);

        let (width, height) = (image.width() as i64, image.height() as i64);
        let (fb_width, fb_height) = (fb_size.width as i64, fb_size.height as i64);
        let (x, y) = match position {
            Position::TopLeft => (0, 0),
            Position::Center => ((fb_width - width) / 2, (fb_height - height) / 2),
            Position::Custom { x, y } => (x, y),
        };

        if clear {
            let _ = maybe_menu.clear_framebuffer();
        }

        if let Err(error) = maybe_menu.send_to_framebuffer(image, (x, y)) {
            error!(error, "Failed to send image to framebuffer");
        }
    }
}
