use crate::macguiver::buffer::DrawBuffer;
use crate::macguiver::platform::sdl::output::OutputImage;
use crate::macguiver::platform::PlatformWindow;
use embedded_graphics::geometry::Size;
use embedded_graphics::pixelcolor::raw::ToBytes;
use embedded_graphics::pixelcolor::{PixelColor, Rgb888};
use std::time::Instant;

mod sdl_window;
use crate::macguiver::platform::sdl::SdlPlatform;
use sdl_window::SdlWindow;

pub struct Window<C: PixelColor> {
    framebuffer: OutputImage<Rgb888>,
    inner: SdlWindow,
    frame_start: Instant,

    phantom: std::marker::PhantomData<C>,
}

impl<C: PixelColor + From<Rgb888> + Into<Rgb888>> Window<C> {
    pub fn new(platform: &mut SdlPlatform<C>, title: &str, size: Size) -> Self
    where
        <<C as PixelColor>::Raw as ToBytes>::Bytes: AsRef<[u8]>,
        <C as embedded_graphics::prelude::PixelColor>::Raw: From<C>,
    {
        let framebuffer = OutputImage::new::<C>(size, &platform.init_state.output_settings);
        let inner = SdlWindow::new(platform, title, size);

        Self {
            framebuffer,
            inner,
            frame_start: Instant::now(),
            phantom: std::marker::PhantomData,
        }
    }
}

impl<C> PlatformWindow for Window<C>
where
    C: PixelColor + Into<Rgb888> + From<Rgb888>,
    <<C as PixelColor>::Raw as ToBytes>::Bytes: AsRef<[u8]>,
    <C as PixelColor>::Raw: From<C>,
{
    type Color = C;

    fn update(&mut self, display: &DrawBuffer<Self::Color>) {
        let framebuffer = &mut self.framebuffer;
        let sdl_window = &mut self.inner;

        framebuffer.update(display);
        sdl_window.update(framebuffer);
    }
}
