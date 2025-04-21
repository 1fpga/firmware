use cfg_if::cfg_if;
use std::path::PathBuf;

pub fn config_root_path() -> PathBuf {
    // On DE10-Nano, the configurations are in /media/fat/1fpga
    cfg_if! {
        if #[cfg(feature = "platform_de10")] {
            let p = PathBuf::from("/media/fat/1fpga");
        } else {
            let p = dirs::config_dir().unwrap().join("1fpga");
        }
    }

    if !p.exists() {
        std::fs::create_dir_all(&p).unwrap();
    }
    p
}

pub fn screenshots_root() -> PathBuf {
    let p = config_root_path().join("screenshots");
    if !p.exists() {
        std::fs::create_dir_all(&p).unwrap();
    }
    p
}

pub fn core_root_path() -> PathBuf {
    let p = config_root_path().join("cores");
    if !p.exists() {
        std::fs::create_dir_all(&p).unwrap();
    }
    p
}

pub fn savestates_root_path() -> PathBuf {
    let p = config_root_path().join("savestates");
    if !p.exists() {
        std::fs::create_dir_all(&p).unwrap();
    }
    p
}

pub fn sav_root_path() -> PathBuf {
    let p = config_root_path().join("saves");
    if !p.exists() {
        std::fs::create_dir_all(&p).unwrap();
    }
    p
}

pub fn savestates_path(core_name: &str) -> PathBuf {
    savestates_root_path().join(core_name)
}

pub fn sav_path(core_name: &str) -> PathBuf {
    sav_root_path().join(core_name)
}
