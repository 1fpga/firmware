use std::sync::{Arc, Mutex};

use embedded_graphics::draw_target::DrawTarget;
use embedded_graphics::pixelcolor::{BinaryColor, Rgb888};
use embedded_graphics::Drawable;
use sdl3::event::Event;
use sdl3::gamepad::Gamepad;
use sdl3::joystick::Joystick;
use tracing::{info, warn};

use golem_db::Connection;

use crate::application::coordinator::Coordinator;
use crate::application::toolbar::Toolbar;
use crate::data::paths;
use crate::data::settings::Settings;
use crate::macguiver::application::EventLoopState;
use crate::macguiver::buffer::DrawBuffer;
use crate::platform::de10::De10Platform;
use crate::platform::WindowManager;

pub mod menu;

pub mod panels;
mod toolbar;
mod widgets;

pub mod coordinator;

pub struct GoLEmApp {
    platform: De10Platform,

    toolbar: Toolbar,
    settings: Arc<Settings>,
    database: Arc<Mutex<Connection>>,

    coordinator: Coordinator,

    render_toolbar: bool,

    joysticks: [Option<Joystick>; 32],
    gamepads: [Option<Gamepad>; 32],

    toolbar_buffer: DrawBuffer<BinaryColor>,
    osd_buffer: DrawBuffer<BinaryColor>,
}

impl GoLEmApp {
    pub fn new() -> Self {
        let platform = WindowManager::default();

        let settings = Arc::new(Settings::new());

        let database_url = paths::config_root_path().join("golem.sqlite");

        let database = golem_db::establish_connection(&database_url.to_string_lossy())
            .expect("Failed to connect to database");
        let database = Arc::new(Mutex::new(database));
        let toolbar_size = platform.toolbar_dimensions();
        let osd_size = platform.osd_dimensions();

        // Due to a limitation in Rust language right now, None does not implement Copy
        // when Option<T> does not. This means we can't use it in an array. So we use a
        // constant to work around this.
        let joysticks = {
            const NONE: Option<Joystick> = None;
            [NONE; 32]
        };
        let gamepads = {
            const NONE: Option<Gamepad> = None;
            [NONE; 32]
        };

        Self {
            toolbar: Toolbar::new(settings.clone(), database.clone()),
            coordinator: Coordinator::new(database.clone()),
            render_toolbar: true,
            joysticks,
            gamepads,
            database,
            settings,
            platform,
            toolbar_buffer: DrawBuffer::new(toolbar_size),
            osd_buffer: DrawBuffer::new(osd_size),
        }
    }

    pub fn settings(&self) -> &Settings {
        &self.settings
    }

    pub fn init_platform(&mut self) {
        self.platform.init();
    }

    pub fn main_buffer(&mut self) -> &mut DrawBuffer<Rgb888> {
        self.platform_mut().main_buffer()
    }

    pub fn osd_buffer(&mut self) -> &mut DrawBuffer<BinaryColor> {
        &mut self.osd_buffer
    }

    pub fn database(&self) -> Arc<Mutex<Connection>> {
        self.database.clone()
    }

    pub fn platform_mut(&mut self) -> &mut WindowManager {
        &mut self.platform
    }

    pub fn hide_toolbar(&mut self) {
        self.render_toolbar = false;
    }

    pub fn show_toolbar(&mut self) {
        self.render_toolbar = true;
    }

    pub fn coordinator_mut(&mut self) -> Coordinator {
        self.coordinator.clone()
    }

    fn draw_inner<R>(&mut self, drawer_fn: impl FnOnce(&mut Self) -> R) -> R {
        self.osd_buffer.clear(BinaryColor::Off).unwrap();
        let result = drawer_fn(self);

        if self.render_toolbar && self.toolbar.update() {
            self.toolbar_buffer.clear(BinaryColor::Off).unwrap();
            self.toolbar.draw(&mut self.toolbar_buffer).unwrap();

            if self.settings.invert_toolbar() {
                self.toolbar_buffer.invert();
            }

            self.platform.update_toolbar(&self.toolbar_buffer);
        }

        // self.platform.update_menu_framebuffer();
        self.platform.update_osd(&self.osd_buffer);

        result
    }

    pub fn draw<R>(&mut self, drawer_fn: impl FnOnce(&mut Self) -> R) -> R {
        self.platform.start_loop();

        let result = self.draw_inner(drawer_fn);

        self.platform.end_loop();
        result
    }

    pub fn event_loop<R>(
        &mut self,
        mut loop_fn: impl FnMut(&mut Self, &mut EventLoopState) -> Option<R>,
    ) -> R {
        loop {
            self.platform.start_loop();

            let events = self.platform.events();
            for event in events.iter() {
                match event {
                    Event::Quit { .. } => {
                        info!("Quit event received. Quitting...");
                        std::process::exit(0);
                    }
                    Event::JoyDeviceAdded { which, .. } => {
                        let j = self
                            .platform
                            .sdl()
                            .joystick
                            .borrow_mut()
                            .open(*which)
                            .unwrap();
                        if let Some(Some(j)) = self.joysticks.get(*which as usize) {
                            warn!("Joystick {} was already connected. Replacing it.", j.name());
                        }

                        self.joysticks[*which as usize] = Some(j);
                    }
                    Event::JoyDeviceRemoved { which, .. } => {
                        if let Some(None) = self.joysticks.get(*which as usize) {
                            warn!("Joystick #{which} was not detected.");
                        }

                        self.joysticks[*which as usize] = None;
                    }
                    Event::ControllerDeviceAdded { which, .. } => {
                        let g = self
                            .platform
                            .sdl()
                            .gamepad
                            .borrow_mut()
                            .open(*which)
                            .unwrap();
                        if let Some(Some(g)) = self.gamepads.get(*which as usize) {
                            warn!("Gamepad {} was already connected. Replacing it.", g.name());
                        }

                        self.gamepads[*which as usize] = Some(g);
                    }
                    Event::ControllerDeviceRemoved { which, .. } => {
                        if let Some(None) = self.gamepads.get(*which as usize) {
                            warn!("Gamepad #{which} was not detected.");
                        }

                        self.gamepads[*which as usize] = None;
                    }
                    _ => {}
                }
            }

            let mut state = EventLoopState::new(events);

            if let Some(r) = self.draw_inner(|s| loop_fn(s, &mut state)) {
                break r;
            }

            self.platform.end_loop();
        }
    }
}
