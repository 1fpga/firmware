use crate::input::{BasicInputShortcut, InputState};
use crate::macguiver::application::Application;
use embedded_graphics::draw_target::DrawTarget;
use embedded_graphics::mono_font::{ascii, MonoTextStyle};
use embedded_graphics::pixelcolor::BinaryColor;
use embedded_graphics::prelude::*;
use embedded_graphics::primitives::{Line, PrimitiveStyle};
use embedded_graphics::text::Text;
use embedded_graphics::Drawable;
use embedded_layout::layout::linear::{spacing, LinearLayout};
use embedded_layout::prelude::*;
use embedded_text::style::{HeightMode, TextBoxStyleBuilder};
use embedded_text::TextBox;
use sdl3::event::Event;

pub fn input_tester(app: &mut impl Application<Color = BinaryColor>) {
    let display_area = app.main_buffer().bounding_box();

    let bounds = app.main_buffer().bounding_box();

    let mut current = InputState::default();
    app.event_loop(move |app, state| {
        let character_style = u8g2_fonts::U8g2TextStyle::new(
            u8g2_fonts::fonts::u8g2_font_haxrcorp4089_t_cyrillic,
            BinaryColor::On,
        );
        let textbox_style = TextBoxStyleBuilder::new()
            .height_mode(HeightMode::FitToText)
            .alignment(embedded_text::alignment::HorizontalAlignment::Justified)
            .paragraph_spacing(1)
            .build();

        let input_str = current.to_string();
        let text_box =
            TextBox::with_textbox_style(&input_str, bounds, character_style, textbox_style);

        let layout = LinearLayout::vertical(
            Chain::new(Text::new(
                "Press ESCAPE to cancel.",
                Point::zero(),
                MonoTextStyle::new(&ascii::FONT_8X13_BOLD, BinaryColor::On),
            ))
            .append(
                Line::new(
                    Point::zero(),
                    Point::new(display_area.bounding_box().size.width as i32, 0),
                )
                .into_styled(PrimitiveStyle::with_stroke(BinaryColor::On, 1)),
            )
            .append(text_box),
        )
        .with_alignment(horizontal::Center)
        .with_spacing(spacing::FixedMargin(2))
        .arrange()
        .align_to(&display_area, horizontal::Center, vertical::Top);

        let buffer = app.main_buffer();
        buffer.clear(BinaryColor::Off).unwrap();
        layout.draw(buffer).unwrap();

        for e in state.events() {
            match e {
                Event::KeyDown {
                    scancode: Some(scancode),
                    repeat: false,
                    ..
                } => {
                    if scancode == sdl3::keyboard::Scancode::Escape {
                        return Some(());
                    }
                    current.key_down(scancode);
                }
                Event::KeyUp {
                    scancode: Some(scancode),
                    ..
                } => {
                    current.key_up(scancode);
                }
                Event::JoyButtonDown {
                    which, button_idx, ..
                } => {
                    current.joystick_button_down(which, button_idx);
                }
                Event::JoyButtonUp {
                    which, button_idx, ..
                } => {
                    current.joystick_button_up(which, button_idx);
                }
                Event::ControllerButtonDown { which, button, .. } => {
                    current.controller_button_down(which, button);
                }
                Event::ControllerButtonUp { which, button, .. } => {
                    current.controller_button_up(which, button);
                }
                _ => {}
            }
        }

        None
    });
}
