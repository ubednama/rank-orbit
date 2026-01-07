from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import logging
from fastapi import FastAPI
from app.api.routes import router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    from app.core.config import get_settings
    settings = get_settings()
    logger.info("🚀 AI Service Starting...")
    logger.info(f"🔧 Config Loaded: Model={settings.MODEL_NAME}")

app.include_router(router, prefix="/api")
