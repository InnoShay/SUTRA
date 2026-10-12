"""
Unit tests for Synthetic Demo Intervention Catalog.
"""

from backend.app.orchestration.catalog import SyntheticDemoCatalog


def test_catalog_synthetic_labeling():
    """All entries in the demo catalog are explicitly labeled as synthetic demo."""
    entries = SyntheticDemoCatalog.list_entries()
    assert len(entries) >= 3

    for entry in entries:
        assert entry.is_synthetic_demo_entry is True
        assert "[SYNTHETIC DEMO]" in entry.title


def test_catalog_entry_lookup():
    """Catalog returns correct entry for valid IDs and None for unknown."""
    entry = SyntheticDemoCatalog.get_entry("INT-VLE-ONBOARD-01")
    assert entry is not None
    assert entry.intervention_id == "INT-VLE-ONBOARD-01"
    assert "ACADEMIC_ADVISOR" in entry.allowed_owner_roles

    unknown = SyntheticDemoCatalog.get_entry("INT-UNKNOWN-999")
    assert unknown is None
    assert SyntheticDemoCatalog.is_valid_intervention("INT-UNKNOWN-999") is False


def test_catalog_allowed_roles():
    """Allowed owner roles are strictly bound to authorized role sets."""
    roles = SyntheticDemoCatalog.get_allowed_roles("INT-VLE-ONBOARD-01")
    assert "ACADEMIC_ADVISOR" in roles
    assert "FINANCIAL_AID_OFFICER" not in roles

    # Unknown intervention returns empty role set
    empty_roles = SyntheticDemoCatalog.get_allowed_roles("INT-NONEXISTENT")
    assert empty_roles == set()
