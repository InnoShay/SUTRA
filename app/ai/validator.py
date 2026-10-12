from typing import Any, Dict, List, Set
from app.schemas.ai import AICandidateInterventionItem


def validate_and_filter_candidate_interventions(
    raw_candidates: List[Dict[str, Any]],
    allowed_catalog: List[Dict[str, Any]],
) -> List[AICandidateInterventionItem]:
    """
    Validates candidate interventions against the authorized campus catalogue.
    Strictly filters out any intervention_key not present in the allowed catalog.
    """
    allowed_map = {item["intervention_key"]: item for item in allowed_catalog}
    valid_items: List[AICandidateInterventionItem] = []

    for raw in raw_candidates:
        if not isinstance(raw, dict):
            continue
        key = str(raw.get("intervention_key", "")).strip()
        if key not in allowed_map:
            # Drop unknown intervention keys to prevent unauthorized actions
            continue

        catalog_entry = allowed_map[key]
        confidence = float(raw.get("confidence", 0.75))
        confidence = max(0.0, min(1.0, confidence))

        valid_items.append(
            AICandidateInterventionItem(
                intervention_key=key,
                display_label=catalog_entry.get("display_label", key),
                domain=catalog_entry.get("domain", "academic"),
                recipient_role=catalog_entry.get("recipient_role", "faculty"),
                confidence=round(confidence, 2),
                evidence_grounding=str(raw.get("evidence_grounding", "Aligned with telemetry")).strip()[:500],
                caveats=str(raw.get("caveats", "Subject to authorized mentor review")).strip()[:500],
            )
        )

    # If no valid candidates survived, provide the primary catalog item as default suggestion
    if not valid_items and allowed_catalog:
        first = allowed_catalog[0]
        valid_items.append(
            AICandidateInterventionItem(
                intervention_key=first["intervention_key"],
                display_label=first["display_label"],
                domain=first["domain"],
                recipient_role=first["recipient_role"],
                confidence=0.70,
                evidence_grounding="Standard catalog recommendation for active academic alerts.",
                caveats="Educator review required.",
            )
        )

    return valid_items
