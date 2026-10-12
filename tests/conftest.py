import uuid
from datetime import datetime, timedelta
from typing import AsyncGenerator
import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.institution import Institution, InstitutionMembership

# Test Database Engine (In-Memory SQLite with aiosqlite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from sqlalchemy.pool import StaticPool

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh database session with all tables created in-memory."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client with database dependency override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


from tests.utils import make_jwt


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    """Seeds test institutions and user memberships."""
    campus_1 = Institution(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        name="Apex Institute of Technology",
        status="active",
    )
    campus_2 = Institution(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        name="Zenith University",
        status="active",
    )
    db_session.add_all([campus_1, campus_2])
    await db_session.flush()

    # User 1: Active Faculty at Campus 1
    user_faculty_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    m1 = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_1.id,
        user_id=user_faculty_id,
        role="faculty",
        is_active=True,
    )

    # User 2: Inactive Member at Campus 1
    user_inactive_id = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    m2 = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_1.id,
        user_id=user_inactive_id,
        role="faculty",
        is_active=False,
    )

    # User 3: Active Member at Campus 2 only
    user_campus2_id = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
    m3 = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_2.id,
        user_id=user_campus2_id,
        role="hod",
        is_active=True,
    )

    db_session.add_all([m1, m2, m3])
    await db_session.commit()

    return {
        "campus_1": campus_1,
        "campus_2": campus_2,
        "user_faculty_id": user_faculty_id,
        "user_inactive_id": user_inactive_id,
        "user_campus2_id": user_campus2_id,
    }
