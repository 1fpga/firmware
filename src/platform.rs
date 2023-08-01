use crate::macguiver::application::Application;
use crate::macguiver::events::keyboard::KeycodeMap;
use crate::main_inner::Flags;
use cfg_if::cfg_if;
use embedded_graphics::pixelcolor::{BinaryColor, PixelColor};

cfg_if! {
    if #[cfg(any(
        all(feature = "platform_de10", feature = "platform_desktop"),
        all(feature = "platform_de10", test),
        all(feature = "platform_desktop", test),
    ))] {
        compile_error!("Only one platform can be enabled at a time.");
    } else if #[cfg(feature = "platform_desktop")] {
        mod desktop;
        pub use desktop::PlatformWindowManager;
    } else if #[cfg(feature = "platform_de10")] {
        mod de10;
        pub use de10::PlatformWindowManager;
    } else if #[cfg(test)] {
        mod null;
        pub use null::PlatformWindowManager;
    } else {
        compile_error!("At least one platform must be enabled.");
    }
}

pub type Event = sdl3::event::Event;

#[derive(Default)]
pub struct PlatformState {
    keys: KeycodeMap,
}

impl PlatformState {
    pub fn keys(&self) -> &KeycodeMap {
        &self.keys
    }
}

trait PlatformInner {
    type Color: PixelColor;

    fn run(&mut self, application: &mut impl Application<Color = BinaryColor>, flags: Flags);
}

/// The [WindowManager] structure is responsible for managing and holding the state
/// of the application itself. It takes the main loop, and with every iteration will
/// poll the user input, update the display, and send it to the screen (either in the
/// simulator or on the device's display).
///
/// Because of the differences between SDL/Desktop and the MiSTer itself, we need some
/// abstraction over where and how things are displayed and how inputs are taken.
///
/// Everything that's not related to taking inputs and displaying buffers is handled
/// by the MisterApplication itself.
#[derive(Default)]
pub struct WindowManager {
    inner: self::PlatformWindowManager,
}

impl WindowManager {
    pub fn run(
        &mut self,
        application: &mut impl Application<Color = BinaryColor>,
        flags: Flags,
    ) -> Result<(), String> {
        self.inner.run(application, flags);
        Ok(())

        // OsdSetSize(19);
        //
        // unsafe {
        //     while fpga::is_fpga_ready(1) == 0 {
        //         fpga::fpga_wait_to_reset();
        //     }
        //
        //     loop {
        //         // Polling coroutine.
        //         user_io::user_io_poll();
        //         input::input_poll(0);
        //
        //         // UI coroutine.
        //         menu::HandleUI();
        //
        //         #[cfg(feature = "de10")]
        //         {
        //             use crate::osd;
        //
        //             let n = if user_io::is_menu() != 0 {
        //                 19
        //             } else {
        //                 osd::OsdGetSize()
        //             };
        //
        //             for line in self.osd.line_iter() {
        //                 let line_buffer = self.osd.get_binary_line_array(line);
        //                 spi::spi_osd_cmd_cont(osd::OSD_CMD_WRITE | (line as u8));
        //                 spi::spi_write(line_buffer.as_ptr(), 256, 0);
        //                 spi::DisableOsd();
        //             }
        //             for line in self.title.line_iter() {
        //                 let line_buffer = self.title.get_binary_line_array(line);
        //                 spi::spi_osd_cmd_cont(osd::OSD_CMD_WRITE | (line as u8));
        //                 spi::spi_write(line_buffer.as_ptr(), 256, 0);
        //                 spi::DisableOsd();
        //             }
        //
        //             extern "C" {
        //                 fn mcd_poll();
        //                 fn neocd_poll();
        //                 fn pcecd_poll();
        //                 fn saturn_poll();
        //             }
        //
        //             if user_io::is_megacd() != 0 {
        //                 mcd_poll();
        //             }
        //             if user_io::is_pce() != 0 {
        //                 pcecd_poll();
        //             }
        //             if user_io::is_saturn() != 0 {
        //                 saturn_poll();
        //             }
        //             if user_io::is_neogeo_cd() != 0 {
        //                 neocd_poll();
        //             }
        //         }
        //
        //         #[cfg(not(feature = "de10"))]
        //         {
        //             // self.window_osd.update(&self.osd.inner);
        //             // self.window_title.update(&self.title.inner);
        //             //
        //             // if self
        //             //     .window_osd
        //             //     .events()
        //             //     .any(|e| e == embedded_graphics_simulator::SimulatorEvent::Quit)
        //             // {
        //             //     break;
        //             // }
        //             // if self
        //             //     .window_title
        //             //     .events()
        //             //     .any(|e| e == embedded_graphics_simulator::SimulatorEvent::Quit)
        //             // {
        //             //     break;
        //             // }
        //             // std::thread::sleep(std::time::Duration::from_millis(1));
        //         }
        //     }
        // }
        // Ok(())
    }
}