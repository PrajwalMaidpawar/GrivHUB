"""Local complaint analysis built around the persisted ML classifier.

The trained classifier remains the primary signal. Strong electricity-specific
phrases are used only to reconcile known domain vocabulary gaps in the model
artifact and are reported separately from the raw ML prediction.
"""

import re
from typing import Any, Dict, List, Tuple

from backend.apps.ml_engine.safety_rules import assess_electrical_safety_risk


CATEGORY_RULES: List[Tuple[str, Tuple[str, ...]]] = [
    ("Pole / Wire / Electrical Hazard", ("live wire", "exposed wire", "sparking", "electric shock", "electrical shock", "electrocution", "fallen electric pole", "high voltage wire", "dangerous wire")),
    ("Transformer Fault", ("transformer", "substation")),
    ("Power Outage / No Supply", ("no power", "no electricity", "without electricity", "power outage", "blackout", "power failure", "feeder outage")),
    ("Meter Issues", ("electricity meter", "meter is", "meter reading", "meter not", "meter malfunction")),
    ("Billing and Payment", ("electricity bill", "power bill", "bill amount", "billing", "tariff", "payment")),
    ("Voltage Fluctuation / Low Voltage", ("voltage fluctuation", "low voltage", "voltage dropping", "voltage issue")),
]

ENTITY_PATTERNS = {
    "consumer_number": r"\b(?:consumer|account)\s*(?:number|no\.?)\s*[:#-]?\s*([A-Z0-9-]{6,})\b",
    "voltage": r"\b\d+(?:\.\d+)?\s*(?:v|volt|volts)\b",
    "duration": r"\b(?:since|for)\s+(?:\w+\s+){0,3}(?:hour|hours|day|days|morning|evening|night)\b",
    "asset": r"\b(?:transformer|substation|feeder|pole|meter)\b",
}


def _rule_category(text: str) -> str | None:
    for category, phrases in CATEGORY_RULES:
        if any(phrase in text for phrase in phrases):
            return category
    return None


def _entities(text: str) -> Dict[str, List[str]]:
    entities: Dict[str, List[str]] = {}
    for name, pattern in ENTITY_PATTERNS.items():
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        if matches:
            entities[name] = list(dict.fromkeys(match if isinstance(match, str) else match[0] for match in matches))
    return entities


def _summary(title: str, description: str, category: str, priority: str) -> str:
    detail = " ".join(description.strip().split())
    if len(detail) > 180:
        detail = f"{detail[:177].rstrip()}..."
    return f"{category} complaint ({priority} priority): {detail or title.strip()}".strip()


def analyze_complaint(service: Any, title: str, description: str, threshold: float | None = None) -> Dict[str, Any]:
    """Return ML prediction plus deterministic safety, priority and entities."""
    combined = f"{title} {description}".strip()
    ml_result = service.classify_grievance(description, title=title, custom_threshold=threshold)
    raw_category = ml_result["predicted_category"]
    rule_category = _rule_category(combined.lower())
    category = rule_category or raw_category
    category_source = "LOCAL_ML" if category == raw_category else "LOCAL_ML_WITH_DOMAIN_RULE"

    safety_risk, safety_priority, safety_reason = assess_electrical_safety_risk(description, title=title)
    if safety_priority == "CRITICAL":
        priority = "CRITICAL"
        priority_reason = safety_reason
    elif safety_priority == "HIGH":
        priority = "HIGH"
        priority_reason = safety_reason
    elif category in ("Power Outage / No Supply", "Transformer Fault"):
        priority = "HIGH"
        priority_reason = "High-priority electricity supply or equipment interruption."
    elif category in ("Voltage Fluctuation / Low Voltage", "Meter Issues"):
        priority = "MEDIUM"
        priority_reason = "Technical electricity service issue requiring field review."
    else:
        priority = "LOW"
        priority_reason = "Routine consumer service request."

    return {
        **dict(ml_result),
        "predicted_category": category,
        "raw_ml_category": raw_category,
        "category_source": category_source,
        "summary": _summary(title, description, category, priority),
        "priority": priority,
        "priority_reason": priority_reason,
        "safety_flag": safety_risk != "NONE",
        "safety_risk_level": safety_risk,
        "safety_reason": safety_reason,
        "detected_entities": _entities(combined),
    }
