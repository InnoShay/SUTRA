from app.core.config import Settings


def test_settings_defaults():
    s = Settings()
    assert s.PROJECT_NAME == "SUTRA"
    assert s.VERSION == "0.1.0"
    assert s.API_V1_STR == "/api/v1"
    assert s.SUPABASE_JWT_ALGORITHM == "HS256"
    assert s.ML_DAY30_CUTOFF_DAYS == 30
    assert s.ML_DECISION_THRESHOLD == 0.46


def test_sync_database_url_translation():
    s = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sutra")
    assert s.sync_database_url == "postgresql+psycopg2://user:pass@localhost:5432/sutra"

    s_sqlite = Settings(DATABASE_URL="sqlite+aiosqlite:///:memory:")
    assert s_sqlite.sync_database_url == "sqlite:///:memory:"
