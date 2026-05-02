SHELL := /bin/bash

# Default 4000 — conventional Node.js dev port (Apollo Server, Phoenix).
PORT ?= 4000

.PHONY: install build dev start test lint clean

install:
	@cd ../.. && pnpm install

build:
	pnpm exec webpack --config webpack.config.js --mode production

dev:
	node --env-file=.env --import ./scripts/polyfill-name.mjs --import tsx src/main.ts

start:
	node ../../dist/apps/crawler-service/main.js

test:
	pnpm exec jest --config jest.config.js

lint:
	pnpm exec eslint src/

clean:
	rm -rf ../../dist/apps/crawler-service
