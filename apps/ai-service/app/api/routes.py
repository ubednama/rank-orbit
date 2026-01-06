from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalyzeRequest
from app.services.ai_service import ai_generator

router = APIRouter()


@router.get("/health")
def health_check():
    from datetime import datetime

    return {"status": "ok", "service": "ai-service", "timestamp": datetime.utcnow().isoformat()}


@router.post("/analyze")
def analyze(data: AnalyzeRequest):
    return {"ai_analysis": ai_generator.generate(data)}
