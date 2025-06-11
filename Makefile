NPM := $(shell command -v npm 2> /dev/null)
OPENSSL := $(shell command -v openssl 2> /dev/null)
MISTER_IP := 192.168.1.79

js/frontend/dist/main.js: $(wildcard js/frontend/schemas/**/* js/frontend/migrations/**/* js/frontend/src/**/* js/frontend/src/* js/frontend/types/**/* js/frontend/*.json js/frontend/*.js js/frontend/rollup/*.js)
ifndef NPM
	$(error "No `npm` in PATH, please install Node.js and npm, or pass NPM variable with path to npm binary")
endif
	$(NPM) run build

build-frontend: js/frontend/dist/main.js

.PHONY: target/armv7-unknown-linux-gnueabihf/release/one_fpga

# Do not replace the main.js with a different file or wildcard.
target/armv7-unknown-linux-gnueabihf/release/one_fpga_bin: $(wildcard src/**/*.rs) js/frontend/dist/main.js
	docker build -f ./build/armv7/de10nano.Dockerfile . -t 1fpga:armv7
	docker run -i -e "TERM=xterm-256color" -v "$(PWD)":/app 1fpga:armv7

target/armv7-unknown-linux-gnueabihf/release/one_fpga: target/armv7-unknown-linux-gnueabihf/release/one_fpga_bin
	cp target/armv7-unknown-linux-gnueabihf/release/one_fpga_bin target/armv7-unknown-linux-gnueabihf/release/one_fpga

build-1fpga: target/armv7-unknown-linux-gnueabihf/release/one_fpga

build: build-frontend build-1fpga

build-and-sign: build
ifndef PUBLIC_KEY_PATH
	$(eval PUBLIC_KEY_PATH = $(shell read -p "Enter path to public key: " key; echo $$key))
endif
	$(OPENSSL) pkeyutl -sign \
		-inkey $(PUBLIC_KEY_PATH) \
		-out target/armv7-unknown-linux-gnueabihf/release/one_fpga.sig \
		-rawin -in target/armv7-unknown-linux-gnueabihf/release/one_fpga

deploy-frontend: build-frontend
	rsync -raH --delete js/frontend/dist/ root@$(MISTER_IP):/root/frontend

new-migration:
	mkdir js/frontend/migrations/1fpga/$(shell date +%Y-%m-%d-%H%M%S)_$(name)
	@echo "-- Add your migration here. Comments will be removed." >> js/frontend/migrations/1fpga/$(shell date +%Y-%m-%d-%H%M%S)_$(name)/up.sql

.PHONY: scripts/patreon/patrons.json

scripts/patreon/patrons.json:
	$(eval LAST_RELEASE = $(git tag | sort -r | head -n1))
	LAST_RELEASE=$(LAST_RELEASE) npm run patreon

patreon: scripts/patreon/patrons.json
