pub enum Key {
    Key(one_fpga::inputs::Scancode),
    Button(one_fpga::inputs::Button),
    Axis(one_fpga::inputs::Axis),
}

// #[derive(Debug)]
// pub struct KeyInputSource {
//     token: Option<calloop::Token>,
//     /// Whether to trigger this on key down.
//     on_down: bool,
// }

// impl EventSource for KeyInputSource {
//     type Event = Key;
//     type Metadata = ();
//     type Ret = ();
//     type Error = String;
//
//     fn process_events<F>(
//         &mut self,
//         readiness: Readiness,
//         token: Token,
//         callback: F,
//     ) -> Result<PostAction, Self::Error>
//     where
//         F: FnMut(Self::Event, &mut Self::Metadata) -> Self::Ret,
//     {
//         if self.token != Some(token) {
//             return Ok(PostAction::Continue);
//         }
//
//         Ok(PostAction::Continue)
//     }
//
//     fn register(
//         &mut self,
//         poll: &mut Poll,
//         token_factory: &mut TokenFactory,
//     ) -> calloop::Result<()> {
//         self.token = Some(token_factory.token());
//         todo!()
//     }
//
//     fn reregister(
//         &mut self,
//         poll: &mut Poll,
//         token_factory: &mut TokenFactory,
//     ) -> calloop::Result<()> {
//         todo!()
//     }
//
//     fn unregister(&mut self, poll: &mut Poll) -> calloop::Result<()> {
//         todo!()
//     }
// }
