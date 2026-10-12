import re
import uuid
import pytest
from httpx import AsyncClient

from tests.utils import make_jwt


@pytest.mark.asyncio
async def test_identity_me_unauthenticated(client: AsyncClient):
    """Accessing identity without auth token must return 401."""
    res = await client.get("/api/v1/identity/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_identity_me_idempotent_creation(client: AsyncClient, seed_data):
    """First call creates identity; second call returns the exact same identity."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    # First fetch -> auto provisions
    res1 = await client.get("/api/v1/identity/me", headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200
    data1 = res1.json()

    assert "sutra_id" in data1
    assert re.match(r"^SUTRA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$", data1["sutra_id"])
    assert data1["display_name"] == "Sutra Scholar"
    assert data1["collectible_status"] == "unminted"
    assert data1["is_test_asset"] is True
    assert data1["avatar_config"]["preset"] == "scholar"
    assert data1["avatar_config"]["skin_tone"] == "golden"

    # Second fetch -> returns identical record (idempotency guarantee)
    res2 = await client.get("/api/v1/identity/me", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    data2 = res2.json()

    assert data2["sutra_id"] == data1["sutra_id"]
    assert data2["created_at"] == data1["created_at"]

    # Explicit provision endpoint also returns identical record
    res3 = await client.post("/api/v1/identity/provision", headers={"Authorization": f"Bearer {token}"})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["sutra_id"] == data1["sutra_id"]


@pytest.mark.asyncio
async def test_avatar_update_valid_options(client: AsyncClient, seed_data):
    """Updating avatar with valid approved catalogue traits succeeds."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    payload = {
        "display_name": "Cosmic Voyager",
        "avatar_config": {
            "preset": "innovator",
            "skin_tone": "espresso",
            "hair_style": "locs",
            "hair_color": "electric_teal",
            "expression": "visionary",
            "facial_feature": "light_beard",
            "clothing_style": "streetwear",
            "clothing_color": "violet",
            "accessory": "headphones",
            "background": "cyber",
        },
    }

    res = await client.put(
        "/api/v1/identity/avatar",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["display_name"] == "Cosmic Voyager"
    assert data["avatar_config"]["preset"] == "innovator"
    assert data["avatar_config"]["skin_tone"] == "espresso"
    assert data["avatar_config"]["hair_style"] == "locs"
    assert data["avatar_config"]["hair_color"] == "electric_teal"
    assert data["avatar_config"]["accessory"] == "headphones"


@pytest.mark.asyncio
async def test_avatar_update_invalid_trait_rejected(client: AsyncClient, seed_data):
    """Submitting unapproved trait or arbitrary value is rejected with 422."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    payload = {
        "display_name": "Hacker",
        "avatar_config": {
            "preset": "scholar",
            "skin_tone": "<script>alert('xss')</script>",
            "hair_style": "curls",
            "hair_color": "midnight",
            "expression": "confident",
            "facial_feature": "none",
            "clothing_style": "academic_blazer",
            "clothing_color": "navy",
            "accessory": "none",
            "background": "aurora",
        },
    }

    res = await client.put(
        "/api/v1/identity/avatar",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_identity_nft_stays_unminted_without_live_configuration(client: AsyncClient, seed_data):
    """Missing live chain configuration must never create a fake minted token."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    # Valid EVM address
    mint_payload = {
        "wallet_address": "0x1234567890123456789012345678901234567890"
    }

    res = await client.post(
        "/api/v1/identity/mint",
        json=mint_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["collectible_status"] == "unminted"
    assert data["collectible_token_id"] is None
    assert data["collectible_tx_hash"] is None
    assert data["wallet_address"] == mint_payload["wallet_address"].lower()
    assert data["is_test_asset"] is True
    assert "Base Sepolia" in data["disclaimer"]

    # Duplicate mint call returns same status
    res2 = await client.post(
        "/api/v1/identity/mint",
        json=mint_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    assert res2.json()["collectible_status"] == "unminted"
    assert res2.json()["collectible_token_id"] is None


@pytest.mark.asyncio
async def test_identity_nft_invalid_address_rejected(client: AsyncClient, seed_data):
    """Submitting invalid EVM address is rejected."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    res = await client.post(
        "/api/v1/identity/mint",
        json={"wallet_address": "not-an-evm-address"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_erc721_metadata_endpoint(client: AsyncClient, seed_data):
    """Public ERC-721 token metadata is non-PII and compliant with standards."""
    student_user_id = uuid.uuid4()
    token = make_jwt(user_id=student_user_id)

    # First provision identity
    prov_res = await client.get("/api/v1/identity/me", headers={"Authorization": f"Bearer {token}"})
    sutra_id = prov_res.json()["sutra_id"]

    # Query public metadata
    meta_res = await client.get(f"/api/v1/identity/metadata/{sutra_id}")
    assert meta_res.status_code == 200
    meta = meta_res.json()

    assert "name" in meta
    assert "attributes" in meta
    assert isinstance(meta["attributes"], list)

    # Check traits contain non-PII values
    traits = {a["trait_type"]: a["value"] for a in meta["attributes"]}
    assert traits["Identity Type"] == "SUTRA Verified Student"
    assert traits["Network"] == "Base Sepolia (84532)"
    assert traits["Asset Category"] == "Educational Test Asset"
    assert traits["Generator"] == "SUTRA Identity Painting v1"
    assert "Palette" in traits
    assert "Preset Style" not in traits
    assert "Skin Tone" not in traits

    # Nonexistent sutra_id returns 404
    missing_res = await client.get("/api/v1/identity/metadata/SUTRA-XXXX-NONEXISTENT")
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_identity_artwork_is_a_stable_png(client: AsyncClient, seed_data):
    """Identity artwork is rendered as deterministic raster art, separate from the avatar."""
    token = make_jwt(user_id=uuid.uuid4())
    provisioned = await client.get(
        "/api/v1/identity/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert provisioned.status_code == 200
    identity = provisioned.json()

    first = await client.get(identity["artwork_url"])
    second = await client.get(identity["artwork_url"])
    assert first.status_code == 200
    assert first.headers["content-type"] == "image/png"
    assert first.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert first.content == second.content
