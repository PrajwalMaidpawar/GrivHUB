import json
from typing import Dict, Any, Tuple, Optional
from ml.preprocessing.clean_text import clean_text
from ml.preprocessing.remove_pii import scrub_pii

MIN_TEXT_LENGTH = 10

VALID_TARGET_CATEGORIES = {
    "Power Outage / No Supply",
    "Voltage Fluctuation / Low Voltage",
    "Meter Issues",
    "Billing and Payment",
    "Transformer Fault",
    "Pole / Wire / Electrical Hazard",
    "New Connection / Service Request",
    "Street/Public Electrical Infrastructure",
    "Power Theft / Unauthorized Connection",
    "General Consumer Services"
}

def load_approved_mappings(indian_map_path: str = "ml/mappings/indian_category_mapping.json",
                           nyc_map_path: str = "ml/mappings/nyc_category_mapping.json"):
    with open(indian_map_path, 'r', encoding='utf-8') as f:
        ind_map = json.load(f)
    with open(nyc_map_path, 'r', encoding='utf-8') as f:
        nyc_map = json.load(f)
    return ind_map, nyc_map


def validate_and_transform_indian_record(raw_record: Dict[str, Any], ind_map: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str], Dict[str, int]]:
    """
    Validates and transforms a single Indian OpenCity record.
    Prevents category label leakage (does not prepend the source Category label into complaint_text).
    """
    pii_stats = {"email_count": 0, "phone_count": 0, "aadhaar_count": 0, "pan_count": 0, "total_pii": 0}
    
    # 1. Check Record ID
    comp_id = raw_record.get("Complaint ID") or raw_record.get("_id")
    if not comp_id:
        return None, "MISSING_RECORD_ID", pii_stats
        
    # 2. Check Category Mapping
    cat = raw_record.get("Category", "").strip()
    sub_cat = raw_record.get("Sub Category", "").strip()
    key = f"{cat} -> {sub_cat}"
    
    mapping_info = ind_map.get(key)
    if not mapping_info:
        return None, "UNMAPPED_SOURCE_CATEGORY", pii_stats
        
    target_category = mapping_info.get("target_category")
    status = mapping_info.get("status")
    
    if not target_category or status == "EXCLUDED":
        return None, f"EXCLUDED_CATEGORY: {cat}", pii_stats
        
    if target_category not in VALID_TARGET_CATEGORIES:
        return None, f"INVALID_TARGET_CATEGORY: {target_category}", pii_stats
        
    # 3. Construct Complaint Text (Prevent label leakage: omit raw Category string)
    # Combine sub_cat with ward and remarks for natural civic context
    ward = clean_text(raw_record.get("Ward Name", ""))
    remarks = raw_record.get("Staff Remarks", "")
    staff = clean_text(raw_record.get("Staff Name", ""))
    
    if remarks in ["\\N", "None", None, ""]:
        remarks = ""
    else:
        remarks = str(remarks).strip()
        
    text_parts = [sub_cat]
    if ward and ward.lower() != "unknown":
        text_parts.append(f"in {ward}")
        
    base_text = " ".join(text_parts)
    
    if remarks and remarks.lower() != "1st assignment based on ward mapping":
        raw_text = f"{base_text}. {remarks}"
    elif staff and "/" in staff:
        designation = staff.split("/", 1)[1].strip()
        raw_text = f"{base_text}. Municipal field inspection assigned to {designation} officer."
    else:
        raw_text = base_text
        
    # 4. Clean Text & Scrub PII
    cleaned = clean_text(raw_text)
    scrubbed_text, pii_stats = scrub_pii(cleaned)
    
    # 5. Check Minimum Text Length
    if not scrubbed_text or len(scrubbed_text) < MIN_TEXT_LENGTH:
        return None, f"TOO_SHORT_TEXT (len={len(scrubbed_text)})", pii_stats
        
    # 6. Extract Location & Metadata
    location = {
        "ward_or_borough": clean_text(raw_record.get("Ward Name", "")),
        "address": None,
        "zip_code": None,
        "latitude": None,
        "longitude": None
    }
    
    standard_record = {
        "source_dataset": "INDIAN_OPENCITY_BBMP",
        "source_record_id": str(comp_id),
        "complaint_text": scrubbed_text,
        "source_category": cat,
        "source_subcategory": sub_cat,
        "target_category": target_category,
        "mapping_status": status,
        "agency": clean_text(raw_record.get("Staff Name", "BBMP Municipal Ward Office")),
        "location": location,
        "created_date": raw_record.get("Grievance Date"),
        "status": raw_record.get("Grievance Status", "Registered")
    }
    
    return standard_record, None, pii_stats


def validate_and_transform_nyc_record(raw_record: Dict[str, Any], nyc_map: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str], Dict[str, int]]:
    """
    Validates and transforms a single NYC 311 record.
    Prevents category label leakage (does not prepend the source complaint_type label into complaint_text).
    """
    pii_stats = {"email_count": 0, "phone_count": 0, "aadhaar_count": 0, "pan_count": 0, "total_pii": 0}
    
    # 1. Check Record ID
    key_id = raw_record.get("unique_key")
    if not key_id:
        return None, "MISSING_RECORD_ID", pii_stats
        
    # 2. Check Category Mapping
    comp_type = raw_record.get("complaint_type", "").strip()
    mapping_info = nyc_map.get(comp_type)
    if not mapping_info:
        return None, f"UNMAPPED_SOURCE_CATEGORY: {comp_type}", pii_stats
        
    target_category = mapping_info.get("target_category")
    status = mapping_info.get("status")
    
    if not target_category or status == "EXCLUDED":
        return None, f"EXCLUDED_CATEGORY: {comp_type}", pii_stats
        
    if target_category not in VALID_TARGET_CATEGORIES:
        return None, f"INVALID_TARGET_CATEGORY: {target_category}", pii_stats
        
    # 3. Construct Complaint Text (Prevent label leakage: omit raw complaint_type)
    # Use descriptor + address/borough + resolution description
    descriptor = clean_text(raw_record.get("descriptor", "") or "")
    res_desc = clean_text(raw_record.get("resolution_description", "") or "")
    address = clean_text(raw_record.get("incident_address", "") or "")
    borough = clean_text(raw_record.get("borough", "") or "")
    
    if not descriptor and not res_desc:
        return None, "MISSING_COMPLAINT_TEXT", pii_stats
        
    text_parts = [descriptor] if descriptor else []
    
    loc_parts = []
    if address:
        loc_parts.append(address)
    if borough and borough.lower() != "unspecified":
        loc_parts.append(borough)
        
    if loc_parts:
        text_parts.append(f"at {', '.join(loc_parts)}")
        
    base_text = " ".join(text_parts) if text_parts else descriptor
    
    if res_desc:
        raw_text = f"{base_text}. {res_desc}"
    else:
        raw_text = base_text
        
    # 4. Clean Text & Scrub PII
    cleaned = clean_text(raw_text)
    scrubbed_text, pii_stats = scrub_pii(cleaned)
    
    # 5. Check Minimum Text Length
    if not scrubbed_text or len(scrubbed_text) < MIN_TEXT_LENGTH:
        return None, f"TOO_SHORT_TEXT (len={len(scrubbed_text)})", pii_stats
        
    # 6. Extract Location & Metadata
    lat = raw_record.get("latitude")
    lng = raw_record.get("longitude")
    try:
        lat_f = float(lat) if lat is not None else None
    except (ValueError, TypeError):
        lat_f = None
    try:
        lng_f = float(lng) if lng is not None else None
    except (ValueError, TypeError):
        lng_f = None
        
    location = {
        "ward_or_borough": clean_text(raw_record.get("borough", "")),
        "address": clean_text(raw_record.get("incident_address", "")),
        "zip_code": clean_text(raw_record.get("incident_zip", "")),
        "latitude": lat_f,
        "longitude": lng_f
    }
    
    standard_record = {
        "source_dataset": "NYC_311",
        "source_record_id": str(key_id),
        "complaint_text": scrubbed_text,
        "source_category": comp_type,
        "source_subcategory": str(descriptor),
        "target_category": target_category,
        "mapping_status": status,
        "agency": clean_text(raw_record.get("agency", "")),
        "location": location,
        "created_date": raw_record.get("created_date"),
        "status": raw_record.get("status", "Closed")
    }
    
    return standard_record, None, pii_stats
