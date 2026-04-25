SHELL := /bin/bash

.PHONY: install build dev start test lint clean dockerbuild

install:
	@cd ../.. && pnpm install

build:
	pnpm exec webpack --config webpack.config.js --mode production

dev:
	pnpm exec tsx watch src/main.ts

start:
	node ../../dist/apps/api-gateway/main.js

test:
	pnpm exec jest --config jest.config.cts

lint:
	pnpm exec eslint src/

clean:
	rm -rf ../../dist/apps/api-gateway

dockerbuild:
	cd ../.. && docker build -t rank-orbit-api-gateway -f apps/api-gateway/Dockerfile .
