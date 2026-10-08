import re
from typing import Dict, Any, Tuple

CRITICAL_HAZARD_KEYWORDS = [
    r'\bsparking\b', r'\bspark\b', r'\bfire\b', r'\bblasting?\b', r'\bexplosion\b',
    r'\blive\s*wires?\b', r'\bdangling\s*wires?\b', r'\bfallen\s*poles?\b',
    r'\belectrocution\b', r'\bsmoke\b', r'\bshort\s*circuit\b', r'\bshock\b'
]

HIGH_HAZARD_KEYWORDS = [
    r'\btransformer\s*leakage\b', r'\blow\s*hanging\s*wire\b', r'\bwater\s*stagnation\b',
    r'\bopen\s*feeder\s*box\b', r'\bopen\s*switch\s*gear\b', r'\bburnt\s*meter\b'
]

def assess_electrical_safety_risk(text: str, title: str = "") -> Tuple[str, str, str]:
    """
    Evaluates free-text electricity complaint descriptions against transparent safety rules.
    
    Returns:
        safety_risk_level: 'CRITICAL_HAZARD' | 'HIGH' | 'LOW' | 'NONE'
        suggested_priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        risk_reason: Human-readable rule explanation
    """
    combined_text = f"{title} {text}".lower()

    for pattern in CRITICAL_HAZARD_KEYWORDS:
        if re.search(pattern, combined_text):
            matched = pattern.replace(r'\b', '').replace(r'\s*', ' ')
            return (
                "CRITICAL_HAZARD",
                "CRITICAL",
                f"Emergency electrical safety hazard detected: matched keyword '{matched}'"
            )

    for pattern in HIGH_HAZARD_KEYWORDS:
        if re.search(pattern, combined_text):
            matched = pattern.replace(r'\b', '').replace(r'\s*', ' ')
            return (
                "HIGH",
                "HIGH",
                f"Potential electrical safety risk detected: matched keyword '{matched}'"
            )

    return ("NONE", "MEDIUM", "Standard priority assigned by default rule engine")
