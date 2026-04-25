# ai-service — FastAPI + LangChain + Gemini
# Target: Hugging Face Spaces (Docker SDK) per ADR 008.
# HF Spaces convention: PORT=7860; other hosts inject their own $PORT.

FROM python:3.13-slim AS base

# Faster, deterministic Python settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# uv for fast, reproducible installs
RUN pip install --no-cache-dir uv

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY app/ ./app/

ENV PORT=7860
EXPOSE 7860

# Use sh -c so $PORT expands; default to 7860 if unset
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
