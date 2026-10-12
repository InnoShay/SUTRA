import uuid
from datetime import datetime, timedelta, timezone
import jwt
from app.core.config import settings


def make_jwt(
    user_id: uuid.UUID,
    email: str = "test@sutra.edu",
    expired: bool = False,
    secret: str = settings.SUPABASE_JWT_SECRET,
    algorithm: str = settings.SUPABASE_JWT_ALGORITHM,
    audience: str = "authenticated",
    extra_claims: dict = None,
) -> str:
    """Generates test JWT tokens for authentication testing."""
    now = datetime.now(timezone.utc)
    exp = now - timedelta(hours=1) if expired else now + timedelta(hours=2)
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": audience,
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, secret, algorithm=algorithm)
