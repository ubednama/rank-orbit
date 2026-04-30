SHELL := /bin/bash

PORT ?= 5000

.PHONY: install build dev start lint test clean

install:
	@cd ../.. && pnpm install

build:
	pnpm exec next build

dev:
	pnpm exec next dev -p $(PORT)

start:
	pnpm exec next start -p $(PORT)

lint:
	pnpm exec next lint

test:
	pnpm exec jest --config jest.config.js

clean:
	rm -rf .next dist
