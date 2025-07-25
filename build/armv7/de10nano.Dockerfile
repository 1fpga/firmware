FROM rust:bullseye AS chef
USER root
RUN cargo install cargo-chef
WORKDIR /app

####

FROM chef AS planner

RUN --mount=type=bind,src=src,target=/docker-context/src \
    cd /docker-context/; \
    find src -name "Cargo.toml" -mindepth 0 -maxdepth 4 -exec cp --parents "{}" /app/ \;

RUN find . -type d -maxdepth 4 -exec mkdir "{}"/src \; -exec touch "{}"/src/lib.rs \;
COPY Cargo.toml .
COPY Cargo.lock .

RUN cargo chef prepare --recipe-path recipe.json

####

FROM chef AS builder
RUN apt update && apt upgrade -y
RUN apt install -y g++-arm-linux-gnueabihf libc6-dev-armhf-cross

RUN apt-get install --assume-yes fbi cmake
RUN apt-get install --assume-yes libdbus-1-dev
RUN apt-get install --assume-yes libusb-dev
RUN apt-get install --assume-yes libevdev-dev
RUN apt-get install --assume-yes libudev-dev
RUN apt-get install --assume-yes libclang-dev
RUN apt-get install --assume-yes linux-headers-5.10.0-35-common

RUN ln -s /usr/include/asm-generic /usr/include/asm

WORKDIR /app
COPY build/armv7/config.toml /app/.cargo/config.toml
COPY rust-toolchain.toml /app/rust-toolchain.toml
COPY --from=planner /app/recipe.json recipe.json

ENV CARGO_TARGET_ARMV7_UNKNOWN_LINUX_GNUEABIHF_LINKER=arm-linux-gnueabihf-gcc CC_armv7_unknown_Linux_gnueabihf=arm-linux-gnueabihf-gcc CXX_armv7_unknown_linux_gnueabihf=arm-linux-gnueabihf-g++
RUN rustup target add armv7-unknown-linux-gnueabihf
RUN rustup component add --target armv7-unknown-linux-gnueabihf rust-std
RUN rustup component add rustfmt rustc rust-std clippy

RUN cargo chef cook --release --target armv7-unknown-linux-gnueabihf --recipe-path recipe.json

CMD ["cargo", "build", "--target", "armv7-unknown-linux-gnueabihf", "--release", "--bin", "one_fpga_bin", "--no-default-features", "--features=platform_de10"]
