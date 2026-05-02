from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import logging
from fastapi import FastAPI
from app.api.routes import router

from app.core.logging_config import setup_logging
from app.core.body_limit import BodySizeLimitMiddleware, BODY_LIMIT_BYTES

# Configure logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI()

# Body-size cap. Reject oversized payloads at the ASGI layer before any
# handler runs, so a misbehaving caller can't OOM the worker.
app.add_middleware(BodySizeLimitMiddleware)


@app.on_event("startup")
async def startup_event():
    from app.core.config import get_settings

    settings = get_settings()
    logger.info("🚀 AI Service Starting...")
    logger.info(f"🔧 Config Loaded: Model={settings.MODEL_NAME}")
    logger.info(f"🛡️  Body limit: {BODY_LIMIT_BYTES} bytes")


app.include_router(router, prefix="/api")
