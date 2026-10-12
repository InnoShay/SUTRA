from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.logging import logger


class Base(DeclarativeBase):
    """SQLAlchemy 2.x declarative base class."""
    pass


# Engine configuration with Supabase PgBouncer & PostgreSQL pool settings
engine_kwargs = {
    "echo": False,
    "future": True,
    "pool_pre_ping": settings.DATABASE_POOL_PRE_PING,
}

if settings.DATABASE_URL.startswith("postgresql"):
    connect_args = {}
    if settings.DATABASE_STATEMENT_CACHE_SIZE is not None:
        connect_args["statement_cache_size"] = settings.DATABASE_STATEMENT_CACHE_SIZE
    if connect_args:
        engine_kwargs["connect_args"] = connect_args
    engine_kwargs["pool_size"] = settings.DATABASE_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DATABASE_MAX_OVERFLOW
    engine_kwargs["pool_recycle"] = settings.DATABASE_POOL_RECYCLE

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for obtaining an isolated async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_health() -> bool:
    """Performs a quick SELECT 1 ping to verify database connectivity."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.warning(f"Database health check failed: {str(e)}")
        return False
