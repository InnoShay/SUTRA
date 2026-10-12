import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from app.core.config import settings


def make_jwt(
    user_id: uuid.UUID,
    email: str = "test@sutra.edu",
    expired: bool = False,
    secret: str = settings.SUPABASE_JWT_SECRET,
    algorithm: str = "HS256",
    audience: str = "authenticated",
    extra_claims: dict = None,
    headers: dict = None,
) -> str:
    """Generates test symmetric JWT tokens for authentication testing."""
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
    return jwt.encode(payload, secret, algorithm=algorithm, headers=headers)


def generate_test_ec_key_pair() -> Tuple[ec.EllipticCurvePrivateKey, str]:
    """Generates a transient P-256 EC private key and its corresponding PEM public key string."""
    priv = ec.generate_private_key(ec.SECP256R1())
    pub_pem = priv.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    return priv, pub_pem


def make_es256_jwt(
    user_id: uuid.UUID,
    private_key: ec.EllipticCurvePrivateKey,
    email: str = "student@sutra.edu",
    expired: bool = False,
    audience: str = "authenticated",
    issuer: Optional[str] = None,
    kid: Optional[str] = "test-kid-es256",
    extra_claims: dict = None,
) -> str:
    """Generates test asymmetric ES256 JWT tokens for ECDSA testing."""
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
    if issuer:
        payload["iss"] = issuer
    if extra_claims:
        payload.update(extra_claims)

    headers = {"kid": kid, "alg": "ES256", "typ": "JWT"} if kid else {"alg": "ES256", "typ": "JWT"}
    return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
