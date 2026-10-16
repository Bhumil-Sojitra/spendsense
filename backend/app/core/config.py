"""Core configuration for SpendSense AI backend."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "SpendSense AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # ML Configuration
    ISOLATION_FOREST_CONTAMINATION: float = 0.1
    ISOLATION_FOREST_N_ESTIMATORS: int = 100
    ISOLATION_FOREST_RANDOM_STATE: int = 42
    IQR_MULTIPLIER: float = 1.5
    MIN_SAMPLES_FOR_ML: int = 10

    # Upload limits
    MAX_FILE_SIZE_MB: int = 10
    MAX_TRANSACTIONS: int = 50000

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
