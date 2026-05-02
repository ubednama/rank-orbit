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
    # Default 7860 — Hugging Face Spaces convention; matches the production
    # Dockerfile so local mirrors deploy.
    AI_SERVICE_PORT: int = 7860

    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

    @property
    def masked_api_key(self) -> str:
        if not self.GOOGLE_API_KEY:
            return "NOT_SET"
        return f"{self.GOOGLE_API_KEY[:4]}...{self.GOOGLE_API_KEY[-4:]}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
