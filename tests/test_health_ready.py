import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_health_liveness(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "sutra"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_health_v1_alias(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness_healthy_database(client: AsyncClient):
    with patch("app.api.v1.health.check_database_health", new_callable=AsyncMock) as mock_db:
        mock_db.return_value = True
        response = await client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["checks"]["database"] == "ok"
        assert data["checks"]["ml_model"] in ("ready", "uncalibrated")


@pytest.mark.asyncio
async def test_readiness_database_down(client: AsyncClient):
    with patch("app.api.v1.health.check_database_health", new_callable=AsyncMock) as mock_db:
        mock_db.return_value = False
        response = await client.get("/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["database"] == "error"
