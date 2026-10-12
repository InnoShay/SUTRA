import os
from pathlib import Path
from typing import List, Optional
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_project_root() -> Path:
    """Find the root directory containing ml/ and app/."""
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "ml").exists() and (current / "app").exists():
            return current
        current = current.parent
    return Path.cwd()


PROJECT_ROOT = find_project_root()
DEFAULT_MODEL_PATH = PROJECT_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
DEFAULT_METADATA_PATH = PROJECT_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "SUTRA"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database URLs
    # Async URL for FastAPI asyncpg runtime
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/sutra",
        description="Async PostgreSQL connection URL (e.g. postgresql+asyncpg://... or sqlite+aiosqlite://...)",
    )
    DATABASE_SYNC_URL: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_SYNC_URL", "SYNC_DATABASE_URL"),
        description="Sync PostgreSQL connection URL for Alembic. If unset, derived from DATABASE_URL.",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_RECYCLE: int = 1800
    DATABASE_POOL_PRE_PING: bool = True
    DATABASE_STATEMENT_CACHE_SIZE: int = 0

    # Supabase Auth & JWT Settings
    SUPABASE_URL: str = "https://dwhwnnvdyrxmnamgicga.supabase.co"
    SUPABASE_ANON_KEY: str = "anon-key"
    SUPABASE_JWT_SECRET: str = Field(
        default="development-secret-must-be-at-least-32-chars-long",
        description="HMAC secret used for local development / testing / symmetric signing",
    )
    SUPABASE_JWT_ALGORITHM: str = "HS256"
    SUPABASE_JWT_ALLOWED_ALGORITHMS: List[str] = ["HS256", "ES256", "RS256"]
    SUPABASE_JWT_AUDIENCE: Optional[str] = "authenticated"
    SUPABASE_JWT_ISSUER: Optional[str] = None
    SUPABASE_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_PUBLIC_KEY: Optional[str] = None
    SUPABASE_JWT_PUBLIC_KEY_FALLBACK: Optional[str] = (
        "-----BEGIN PUBLIC KEY-----\n"
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvs4HKn2s7DMYoa5msvjYtQnnONeQ\n"
        "DSJAE8DMAXwjYER3cS++5O04nvMBeuGxzGWX7zUFK6OfYkxtjxQxJ+EHzA==\n"
        "-----END PUBLIC KEY-----"
    )

    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Core Policy and ML configurations
    ACTIVE_POLICY_KEY: str = "ug_attendance_academic_v1"
    ML_MODEL_ARTIFACT_PATH: str = "ml/artifacts/models"
    ML_DAY30_CUTOFF_DAYS: int = 30
    ML_DECISION_THRESHOLD: float = 0.46
    IDEMPOTENCY_CACHE_TTL_SECONDS: int = 86400

    # Bounded AI Orchestration Settings (Phase 6 / ADR-006)
    AI_ENABLED: bool = True
    AI_PROVIDER: str = "mock"  # "mock" | "openai" | "gemini"
    AI_MODEL: str = "gpt-4o-mini"
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    AI_TIMEOUT_SECONDS: float = 10.0
    AI_MAX_RETRIES: int = 2

    # Sarvam AI Indic Regional Language Translation Settings
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_API_URL: str = "https://api.sarvam.ai/translate"

    # Base Sepolia Blockchain & Document Anchoring Settings
    BASE_SEPOLIA_CHAIN_ID: int = 84532
    BASE_SEPOLIA_RPC_URL: str = "https://sepolia.base.org"
    BASE_SEPOLIA_CONTRACT_ADDRESS: Optional[str] = None
    BASE_SEPOLIA_PRIVATE_KEY: Optional[str] = None
    ANCHOR_MODE: str = "simulated"  # "onchain" | "simulated"
    DOCUMENTS_STORAGE_DIR: str = "storage/documents"

    # SBI Digital Rupee (e₹) CBDC Integration Boundary (ADR / Future Readiness)
    CBDC_ENABLED: bool = True
    CBDC_PROVIDER: str = "simulated"  # "simulated" | "sbi_sandbox"
    CBDC_MERCHANT_ID: Optional[str] = None
    CBDC_SANDBOX_URL: Optional[str] = None

    @property
    def sync_database_url(self) -> str:
        """Returns synchronous database URL suitable for Alembic migrations."""
        if self.DATABASE_SYNC_URL:
            return self.DATABASE_SYNC_URL
        url = self.DATABASE_URL
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        if url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        return url


settings = Settings()
