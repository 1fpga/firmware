use crate::fpga::feature::SpiFeatureSet;
use crate::fpga::{IntoLowLevelSpiCommand, SpiCommand, SpiCommandExt};
use std::fmt::{Debug, Formatter};

/// OSD SPI commands.
#[derive(Debug, Clone, Copy, PartialEq, strum::Display)]
#[repr(u16)]
enum OsdCommands {
    /// Write a line to the OSD. Lines are from `0..=8`.
    /// This goes to OsdWriteLine8 = 0x28.
    WriteLine(u8) = 0x20,

    /// Disable the OSD menu.
    Disable = 0x40,

    /// Enable the OSD menu.
    Enable = 0x41,
}

impl IntoLowLevelSpiCommand for OsdCommands {
    #[inline]
    fn into_ll_spi_command(self) -> (SpiFeatureSet, u16) {
        (
            SpiFeatureSet::OSD,
            match self {
                OsdCommands::WriteLine(a) => 0x20 + a as u16,
                OsdCommands::Disable => 0x40,
                OsdCommands::Enable => 0x41,
            },
        )
    }
}

pub struct OsdIoWriteLine<'a>(pub u8, pub &'a [u8]);

// On Debug output, only show the line number, the bytes don't matter.
impl Debug for OsdIoWriteLine<'_> {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), std::fmt::Error> {
        f.debug_tuple("OsdIoWriteLine").field(&self.0).finish()
    }
}

impl SpiCommand for OsdIoWriteLine<'_> {
    const NAME: &'static str = "OsdIoWriteLine";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(OsdCommands::WriteLine(self.0))
            .write_buffer_b(self.1);

        Ok(())
    }
}

#[derive(Debug)]
pub struct OsdEnable;

impl SpiCommand for OsdEnable {
    const NAME: &'static str = "OsdEnable";

    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(OsdCommands::Enable);
        Ok(())
    }
}

#[derive(Debug)]
pub struct OsdDisable;

impl SpiCommand for OsdDisable {
    const NAME: &'static str = "OsdDisable";

    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(OsdCommands::Disable);
        Ok(())
    }
}
