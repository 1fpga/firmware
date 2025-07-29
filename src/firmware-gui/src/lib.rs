use crate::events::Key;
use calloop::timer::{TimeoutAction, Timer};
use calloop::{EventLoop, LoopSignal};
use embedded_graphics::pixelcolor::Rgb888;
use embedded_graphics::prelude::*;
use embedded_graphics::primitives::{Circle, PrimitiveStyle, Rectangle};
use embedded_graphics_framebuf::backends::FrameBufferBackend;
use embedded_graphics_framebuf::FrameBuf;
use linuxfb::TerminalMode;
use std::time::Duration;
use tracing::debug;

pub mod events;

struct LinuxFramebufferInner {
    buffer: linuxfb::Framebuffer,
    _mmap: memmap::MmapMut,

    /// This is self-referential to mmap for performance.
    slice: &'static mut [Rgb888],
}

impl LinuxFramebufferInner {
    /// Creates a new Linux framebuffer instance.
    ///
    /// # SAFETY
    /// - The `_mmap` field must never be moved or dropped while `slice` exists
    /// - The struct must be pinned in memory once created
    /// - The slice lifetime is tied to the struct lifetime through the 'static bound
    fn new(path: impl AsRef<std::path::Path>) -> Result<Self, String> {
        let tty = std::fs::File::open("/dev/tty1")
            .map_err(|e| format!("Failed to open /dev/tty1: {e}"))?;
        linuxfb::set_terminal_mode(&tty, TerminalMode::Graphics).map_err(|e| format!("{e:?}"))?;
        drop(tty);

        let buffer = linuxfb::Framebuffer::new(path).map_err(|err| format!("{err:?}"))?;
        let (width, height) = buffer.get_virtual_size();
        let size = width * height * buffer.get_bytes_per_pixel();

        let mut mmap = buffer.map().map_err(|e| format!("{e:?}"))?;
        let slice = unsafe {
            let (p, slice, s) = mmap.align_to_mut::<Rgb888>();
            assert_eq!(p.len(), 0);
            assert_eq!(slice.len(), (size / buffer.get_bytes_per_pixel()) as usize);
            assert_eq!(s.len(), 0);
            std::slice::from_raw_parts_mut::<'static, Rgb888>(
                slice.as_mut_ptr(),
                (width * height) as usize,
            )
        };

        Ok(Self {
            buffer,
            _mmap: mmap,
            slice,
        })
    }

    fn flip(&mut self) -> Result<(), String> {
        // self.buffer.flip().map_err(|e| format!("{e:?}"))
        Ok(())
    }
}

pub struct Framebuffer {
    inner: LinuxFramebufferInner,
}

impl Framebuffer {
    pub fn new(path: impl AsRef<std::path::Path>) -> Result<Self, String> {
        let inner = LinuxFramebufferInner::new(path)?;
        Ok(Self { inner })
    }

    pub fn flip(&mut self) -> Result<(), String> {
        self.inner.flip()
    }

    pub fn size(&self) -> Size {
        self.inner.buffer.get_size().into()
    }
}

impl FrameBufferBackend for &'_ mut Framebuffer {
    type Color = Rgb888;

    fn set(&mut self, index: usize, color: Self::Color) {
        self.inner.slice[index] = color;
    }

    fn get(&self, index: usize) -> Self::Color {
        self.inner.slice[index]
    }

    fn nr_elements(&self) -> usize {
        self.inner.slice.len()
    }
}

pub struct EventState {
    signal: LoopSignal,
    fb: Framebuffer,
}

pub trait Hooks {
    fn key_down(&self, key: Key, state: &mut EventState) -> Result<(), String>;
}

pub fn r#loop(_hooks: impl Hooks) -> Result<(), String> {
    let mut event_loop: EventLoop<EventState> =
        EventLoop::try_new().expect("Failed to initialize the event loop");

    let handle = event_loop.handle();

    handle
        .insert_source(
            Timer::from_duration(Duration::from_secs(1)),
            |event, _, _| {
                eprintln!("Timer event: {:?}", event);
                TimeoutAction::ToDuration(Duration::new(1, 0))
            },
        )
        .expect("Failed to insert a timer source");

    handle
        .insert_source(
            Timer::from_duration(Duration::from_secs(10)),
            |_event, _, data| {
                eprintln!("Done");
                data.signal.stop();
                TimeoutAction::Drop
            },
        )
        .expect("Failed to insert an end source");

    let fb = Framebuffer::new("/dev/fb0").expect("Failed to create a framebuffer");
    debug!(size = ?fb.size(), "Framebuffer");
    let mut state = EventState {
        signal: event_loop.get_signal(),
        fb,
    };

    let mut color = Rgb888::BLACK;
    event_loop
        .run(Duration::from_millis(16), &mut state, move |state| {
            color = Rgb888::new(
                color.r().wrapping_add(1),
                color.g(),
                color.b().wrapping_sub(1),
            );

            let size = state.fb.size();
            let mut fb = FrameBuf::new(&mut state.fb, size.width as _, size.height as _);
            Rectangle::new(Point::zero(), size)
                .into_styled(PrimitiveStyle::with_fill(color))
                .draw(&mut fb)
                .expect("Could not draw");
            Circle::new(Point::new(100, 100), 80)
                .into_styled(PrimitiveStyle::with_fill(Rgb888::WHITE))
                .draw(&mut fb)
                .expect("Could not draw");

            state.fb.flip()?;
        })
        .expect("Error during loop!");

    Ok(())
}
