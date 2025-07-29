use crate::fpga::feature::SpiFeatureSet;
use crate::fpga::{IntoLowLevelSpiCommand, SpiCommand, SpiCommandExt};
use std::fmt::{Debug, Formatter};

#[derive(Debug, Clone, Copy, PartialEq, strum::Display)]
#[repr(u16)]
#[allow(clippy::enum_variant_names)]
enum Commands {
    FileTx = 0x53,
    FileTxDat = 0x54,
    FileIndex = 0x55,
    FileInfo = 0x56,
}

impl IntoLowLevelSpiCommand for Commands {
    fn into_ll_spi_command(self) -> (SpiFeatureSet, u16) {
        (SpiFeatureSet::FPGA, self as u16)
    }
}

/// Sends the File Index to the FPGA.
#[derive(Debug)]
pub struct FileIndex(u8);

impl SpiCommand for FileIndex {
    const NAME: &'static str = "FileIndex";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(Commands::FileIndex).write_b(self.0);

        Ok(())
    }
}

impl From<u8> for FileIndex {
    #[inline]
    fn from(value: u8) -> Self {
        Self::new(value)
    }
}

impl FileIndex {
    #[inline]
    pub fn new(index: u8) -> Self {
        Self(index)
    }
}

/// Sends the File Info to the FPGA.
#[derive(Debug)]
pub struct FileExtension<'a>(pub &'a str);

impl SpiCommand for FileExtension<'_> {
    const NAME: &'static str = "FileExtension";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        let ext_bytes = self.0.as_bytes();
        // Extend to 4 characters with the dot.
        let ext: [u8; 4] = [
            b'.',
            ext_bytes.first().copied().unwrap_or(0),
            ext_bytes.get(1).copied().unwrap_or(0),
            ext_bytes.get(2).copied().unwrap_or(0),
        ];

        spi.command(Commands::FileInfo)
            .write(((ext[0] as u16) << 8) | ext[1] as u16)
            .write(((ext[2] as u16) << 8) | ext[3] as u16);

        Ok(())
    }
}

/// Send the File size to the FPGA.
#[derive(Debug)]
pub struct FileTxEnabled(pub Option<u32>);

impl SpiCommand for FileTxEnabled {
    const NAME: &'static str = "FileTxEnabled";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        let mut command = spi.command(Commands::FileTx);
        command.write_b(0xff);

        if let Some(size) = self.0 {
            command.write(size as u16).write((size >> 16) as u16);
        }

        Ok(())
    }
}

/// Send the File size to the FPGA.
#[derive(Debug)]
pub struct FileTxDisabled;

impl SpiCommand for FileTxDisabled {
    const NAME: &'static str = "FileTxDisabled";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(Commands::FileTx).write_b(0);

        Ok(())
    }
}

/// Send the File data to the FPGA on 8-bit bus.
#[derive(Debug)]
pub struct FileTxData8Bits<'a>(pub &'a [u8]);

impl SpiCommand for FileTxData8Bits<'_> {
    const NAME: &'static str = "FileTxData8Bits";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(Commands::FileTxDat).write_buffer_b(self.0);
        Ok(())
    }
}

/// Send the File data to the FPGA on a 16 bits bus.
pub struct FileTxData16Bits<'a>(pub &'a [u16]);

impl Debug for FileTxData16Bits<'_> {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result<(), std::fmt::Error> {
        f.debug_tuple("FileTxData16Bits")
            .field(&format!("[..{}]", self.0.len()))
            .finish()
    }
}

impl SpiCommand for FileTxData16Bits<'_> {
    const NAME: &'static str = "FileTxData16Bits";

    #[inline]
    fn execute<S: SpiCommandExt>(&mut self, spi: &mut S) -> Result<(), String> {
        spi.command(Commands::FileTxDat).write_buffer_w(self.0);
        Ok(())
    }
}
