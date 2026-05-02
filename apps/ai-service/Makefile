# ai-service — FastAPI + LangChain + Gemini

SHELL := /bin/bash

VENV ?= venv
PYTHON ?= python3.13
# Default 7860 — Hugging Face Spaces convention; matches the production
# Dockerfile so local mirrors deploy.
PORT ?= 7860

.PHONY: help install build dev test lint format clean dockerbuild dockerrun

help:
	@echo "ai-service targets:"
	@echo "  install       create venv, install pinned deps"
	@echo "  build         no-op (interpreted)"
	@echo "  dev           run uvicorn in --reload mode on PORT=$(PORT)"
	@echo "  test          run pytest"
	@echo "  lint          black --check + (later) ruff + mypy"
	@echo "  format        black ."
	@echo "  dockerbuild   docker build -t rank-orbit-ai-service ."
	@echo "  dockerrun     docker run with .env.local"
	@echo "  clean         remove venv and __pycache__"

install:
	@if [ ! -d "$(VENV)" ]; then $(PYTHON) -m venv $(VENV); fi
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r requirements.txt

build:
	@echo "ai-service is interpreted; no build step"

dev:
	$(VENV)/bin/uvicorn app.main:app --host 0.0.0.0 --port $(PORT) --reload

test:
	@if [ -d "tests" ]; then $(VENV)/bin/pytest tests/; else echo "no tests/ directory yet"; fi

lint:
	$(VENV)/bin/black --check app/

format:
	$(VENV)/bin/black app/

clean:
	rm -rf $(VENV) __pycache__ app/__pycache__ app/*/__pycache__ logs/

dockerbuild:
	docker build -t rank-orbit-ai-service .

dockerrun:
	docker run --rm -p $(PORT):7860 --env-file .env.local rank-orbit-ai-service
