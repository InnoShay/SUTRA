import logging
import re
import sys
from typing import Any, Dict

# Sensitive keys to redact
SENSITIVE_FIELD_NAMES = {
    "authorization",
    "password",
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "supabase_anon_key",
    "supabase_jwt_secret",
    "fee_amount",
    "bank_account",
    "account_number",
    "counselling_note",
    "session_notes",
    "parent_phone",
    "phone_number",
}

REDACTION_MASK = "[REDACTED]"


def redact_sensitive_data(data: Any) -> Any:
    """Recursively redacts sensitive keys and values from dicts, lists, and strings."""
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_FIELD_NAMES:
                cleaned[k] = REDACTION_MASK
            else:
                cleaned[k] = redact_sensitive_data(v)
        return cleaned
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    elif isinstance(data, str):
        # Redact Bearer tokens in headers
        if data.lower().startswith("bearer "):
            return "Bearer " + REDACTION_MASK
        return data
    return data


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configures root and application loggers with structured output format."""
    logger = logging.getLogger("sutra")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
