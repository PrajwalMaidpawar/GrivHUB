import pytest
from backend.grievances.services.ml_classifier import get_ml_service
from backend.apps.ml_engine.safety_rules import assess_electrical_safety_risk
from backend.apps.ml_engine.complaint_analysis import analyze_complaint

def test_ml_service_inference():
    service = get_ml_service()
    assert service.is_loaded is True
    
    result = service.predict("Streetlight pole transformer sparking heavily with visible fire")
    assert "predicted_category" in result
    assert "confidence" in result


def test_electrical_safety_risk_engine():
    risk, priority, reason = assess_electrical_safety_risk("Live dangling wire sparking near school gate")
    assert risk == "CRITICAL_HAZARD"
    assert priority == "CRITICAL"
    assert "sparking" in reason


def test_demo_complaint_analysis_cases():
    service = get_ml_service()
    cases = [
        (
            "I have been without electricity since morning. The entire area has no power.",
            "Power Outage / No Supply",
            "HIGH",
            False,
        ),
        (
            "There is an exposed live wire sparking near the road and children are passing through the area.",
            "Pole / Wire / Electrical Hazard",
            "CRITICAL",
            True,
        ),
        (
            "My electricity meter is not working correctly and the reading is not updating.",
            "Meter Issues",
            "MEDIUM",
            False,
        ),
        (
            "My electricity bill amount is incorrect and I want clarification.",
            "Billing and Payment",
            "LOW",
            False,
        ),
        (
            "The transformer near our locality is making a loud noise and there is smoke coming from it.",
            "Transformer Fault",
            "CRITICAL",
            True,
        ),
    ]

    for description, category, priority, safety_flag in cases:
        result = analyze_complaint(service, "Demo electricity complaint", description)
        assert result["predicted_category"] == category
        assert 0.0 <= result["confidence"] <= 1.0
        assert result["summary"]
        assert result["priority"] == priority
        assert result["safety_flag"] is safety_flag
