use crate::application::toolbar::Toolbar;
use crate::data::settings::UiSettings;
use crate::input::commands::CommandId;
use crate::input::shortcut::Shortcut;
use crate::input::InputState;
use crate::macguiver::application::EventLoopState;
use crate::macguiver::buffer::DrawBuffer;
use crate::platform::de10::De10Platform;
use crate::platform::WindowManager;
use embedded_graphics::draw_target::DrawTarget;
use embedded_graphics::pixelcolor::{BinaryColor, Rgb888};
use embedded_graphics::prelude::DrawTargetExt;
use embedded_graphics::Drawable;
use sdl3::event::Event;
use sdl3::gamepad::Gamepad;
use std::cell::RefCell;
use std::collections::HashMap;
use tracing::{debug, info, trace, warn};

pub mod menu;

pub mod panels;
mod toolbar;
mod widgets;

pub struct OneFpgaApp {
    platform: De10Platform,

    toolbar: Toolbar,

    render_toolbar: bool,

    gamepads: [Option<Gamepad>; 32],

    toolbar_buffer: Option<DrawBuffer<BinaryColor>>,
    osd_buffer: Option<DrawBuffer<BinaryColor>>,

    input_state: InputState,
    shortcuts: RefCell<HashMap<Shortcut, CommandId>>,

    ui_settings: UiSettings,
}

impl OneFpgaApp {
    pub fn new() -> Self {
        let platform = WindowManager::default();

        let toolbar_size = platform.toolbar_dimensions();
        let osd_size = platform.osd_dimensions();

        // Due to a limitation in Rust language right now, None does not implement Copy
        // when Option<T> does not. This means we can't use it in an array. So we use a
        // constant to work around this.
        let gamepads = {
            const NONE: Option<Gamepad> = None;
            [NONE; 32]
        };

        let mut app = Self {
            toolbar: Toolbar::new(),
            render_toolbar: true,
            gamepads,
            platform,
            toolbar_buffer: Some(DrawBuffer::new(toolbar_size)),
            osd_buffer: Some(DrawBuffer::new(osd_size)),
            input_state: InputState::default(),
            shortcuts: Default::default(),
            ui_settings: UiSettings::default(),
        };
        app.init_platform();

        app
    }

    pub fn add_shortcut(&self, shortcut: Shortcut, command: CommandId) {
        self.shortcuts.borrow_mut().insert(shortcut, command);
    }

    pub fn remove_shortcut(&self, shortcut: &Shortcut) -> Option<CommandId> {
        self.shortcuts.borrow_mut().remove(shortcut)
    }

    pub fn init_platform(&mut self) {
        self.platform.init();
    }

    pub fn main_buffer(&mut self) -> &mut DrawBuffer<Rgb888> {
        self.platform_mut().main_buffer()
    }

    pub fn osd_buffer(&mut self) -> &mut DrawBuffer<BinaryColor> {
        self.osd_buffer.get_or_insert_with(|| {
            let osd_size = self.platform.osd_dimensions();
            DrawBuffer::new(osd_size)
        })
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

    pub fn ui_settings(&self) -> &UiSettings {
        &self.ui_settings
    }

    pub fn ui_settings_mut(&mut self) -> &mut UiSettings {
        &mut self.ui_settings
    }

    fn draw_inner<R>(&mut self, drawer_fn: impl FnOnce(&mut Self) -> R) -> R {
        if let Some(osd_buffer) = self.osd_buffer.clone().as_mut() {
            osd_buffer.clear(BinaryColor::Off).unwrap();
            let result = drawer_fn(self);

            if self.render_toolbar {
                if let Some(toolbar_buffer) = self.toolbar_buffer.clone().as_mut() {
                    toolbar_buffer.clear(BinaryColor::Off).unwrap();
                    self.toolbar.update(*self.ui_settings());
                    self.toolbar.draw(toolbar_buffer).unwrap();

                    if self.ui_settings.invert_toolbar() {
                        toolbar_buffer.invert();
                    }

                    self.platform.update_toolbar(toolbar_buffer);
                }
            }

            self.platform.update_osd(&osd_buffer);
            osd_buffer
                .draw(&mut self.platform.main_buffer().color_converted())
                .unwrap();

            result
        } else {
            drawer_fn(self)
        }
    }

    pub fn draw_once<R>(&mut self, drawer_fn: impl FnOnce(&mut Self) -> R) -> R {
        self.draw_inner(drawer_fn)
    }

    pub fn run_draw_loop<R>(
        &mut self,
        mut loop_fn: impl FnMut(&mut Self, EventLoopState) -> Option<R>,
    ) -> R {
        self.run_event_loop(|s, state| s.draw_inner(|s| loop_fn(s, state)))
    }

    pub fn run_event_loop<R>(
        &mut self,
        mut loop_fn: impl FnMut(&mut Self, EventLoopState) -> Option<R>,
    ) -> R {
        let mut triggered_commands = vec![];

        loop {
            let events = self.platform.events();

            let mut longest_shortcut = Shortcut::default();
            let mut shortcut = None;

            let mut check_shortcuts = false;
            for event in events.iter() {
                trace!(?event, "Event received");

                match event {
                    Event::Quit { .. } => {
                        info!("Quit event received. Quitting...");
                        std::process::exit(0);
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
                            warn!(
                                "Gamepad {} was already connected. Replacing it.",
                                g.name().unwrap_or_else(|| "<unnamed>".into())
                            );
                        }
                        debug!(name = g.name(), mapping = g.mapping(), "Gamepad connected");

                        self.gamepads[*which as usize] = Some(g);
                    }
                    Event::ControllerDeviceRemoved { which, .. } => {
                        if let Some(None) = self.gamepads.get(*which as usize) {
                            warn!("Gamepad #{which} was not detected.");
                        }

                        self.gamepads[*which as usize] = None;
                    }
                    Event::KeyDown {
                        scancode: Some(scancode),
                        repeat,
                        ..
                    } => {
                        if !repeat {
                            self.input_state.key_down(*scancode);
                            check_shortcuts = true;
                        }
                    }
                    Event::KeyUp {
                        scancode: Some(scancode),
                        ..
                    } => {
                        self.input_state.key_up(*scancode);
                        check_shortcuts = true;
                    }
                    Event::ControllerButtonDown { which, button, .. } => {
                        self.input_state.controller_button_down(*which, *button);
                        check_shortcuts = true;
                    }
                    Event::ControllerButtonUp { which, button, .. } => {
                        self.input_state.controller_button_up(*which, *button);
                        check_shortcuts = true;
                    }
                    Event::ControllerAxisMotion {
                        which, axis, value, ..
                    } => {
                        self.input_state
                            .controller_axis_motion(*which, *axis, *value);
                        check_shortcuts = true;
                    }
                    _ => {}
                }
            }
            if check_shortcuts {
                for (s, id) in self.shortcuts.borrow().iter() {
                    if s.matches(&self.input_state) {
                        if triggered_commands.contains(id) {
                            continue;
                        }

                        debug!(id = ?*id, shortcut = ?s, input_state = ?self.input_state, "Command triggered");
                        triggered_commands.push(*id);

                        if s > &longest_shortcut {
                            longest_shortcut = s.clone();
                            shortcut = Some(*id);
                        }
                    } else {
                        triggered_commands.retain(|x| x != id);
                    }
                }
            }

            if let Some(r) = loop_fn(self, EventLoopState { events, shortcut }) {
                break r;
            }
        }
    }
}
