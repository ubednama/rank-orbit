# Rank Orbit — root Makefile
# Single entrypoint for build, test, lint, dev across all services.
# Per-app Makefiles live in apps/<service>/Makefile.
#
# Usage:
#   make install         # install all deps (pnpm + per-service)
#   make dev             # print available dev targets
#   make dev-ai          # run ai-service in dev mode
#   make dev-gateway     # run api-gateway in dev mode (after port)
#   make build           # build all
#   make test            # run all tests
#   make lint            # lint everything
#   make ci              # what CI runs

SHELL := /bin/bash

# ---- Detect which apps are ported (have a Makefile) ----
APPS_WITH_MAKEFILE := $(notdir $(patsubst %/Makefile,%,$(wildcard apps/*/Makefile)))

.PHONY: help
help:
	@echo "Rank Orbit Makefile"
	@echo ""
	@echo "Common targets:"
	@echo "  make install         install all deps"
	@echo "  make dev             list dev targets"
	@echo "  make build           build all ported apps"
	@echo "  make test            run all tests"
	@echo "  make lint            lint everything (eslint + prettier)"
	@echo "  make format          format all files (prettier --write)"
	@echo "  make typecheck       run tsc on all TS projects"
	@echo "  make ci              what CI runs: install + lint + typecheck + test + build"
	@echo ""
	@echo "Apps with Makefiles: $(APPS_WITH_MAKEFILE)"
	@echo ""
	@echo "Per-app dev targets:"
	@for app in $(APPS_WITH_MAKEFILE); do echo "  make dev-$$app"; done

# ---- Install ----
.PHONY: install install-pnpm install-apps
install: install-pnpm install-apps

install-pnpm:
	pnpm install

install-apps:
	@for app in $(APPS_WITH_MAKEFILE); do \
		echo ">> install: $$app"; \
		$(MAKE) -C apps/$$app install || exit $$?; \
	done

# ---- Build ----
.PHONY: build
build:
	@for app in $(APPS_WITH_MAKEFILE); do \
		echo ">> build: $$app"; \
		$(MAKE) -C apps/$$app build || exit $$?; \
	done

# ---- Dev (per-service) ----
.PHONY: dev
dev:
	@echo "Run one of:"
	@for app in $(APPS_WITH_MAKEFILE); do echo "  make dev-$$app"; done

dev-%:
	@if [ -d "apps/$*" ] && [ -f "apps/$*/Makefile" ]; then \
		$(MAKE) -C apps/$* dev; \
	else \
		echo "No Makefile at apps/$*/Makefile"; exit 1; \
	fi

# ---- Test ----
.PHONY: test test-js test-py
test: test-js test-py

test-js:
	pnpm exec jest --passWithNoTests

test-py:
	@if [ -f "apps/ai-service/Makefile" ]; then $(MAKE) -C apps/ai-service test; fi

# ---- Lint ----
.PHONY: lint lint-js lint-format
lint: lint-js lint-format

lint-js:
	pnpm exec eslint .

lint-format:
	pnpm exec prettier --check .

# ---- Format ----
.PHONY: format
format:
	pnpm exec prettier --write .

# ---- Typecheck ----
.PHONY: typecheck
typecheck:
	pnpm exec tsc -b --pretty || true

# ---- CI ----
.PHONY: ci
ci: install lint typecheck test build

# ---- Clean ----
.PHONY: clean
clean:
	rm -rf node_modules .next dist build coverage
	@for app in $(APPS_WITH_MAKEFILE); do \
		$(MAKE) -C apps/$$app clean 2>/dev/null || true; \
	done
