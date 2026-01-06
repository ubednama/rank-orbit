from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Load .env from project root (two levels up from core/)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    PROJECT_NAME: str = "Rank Orbit AI Service"
    GOOGLE_API_KEY: str = ""
    MODEL_NAME: str = "gemini-1.5-flash"
    AI_SERVICE_PORT: int = 8000

    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
