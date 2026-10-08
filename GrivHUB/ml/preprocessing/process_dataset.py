"""
GrievanceHUB Phase 7: Real Indian Dataset Processing Pipeline
Processes 100% REAL Indian electricity & electrical infrastructure grievance records from OpenCity.
EXCLUDES NYC 311 data (Phase 5 compliance), excludes synthetic data (Phase 4 compliance).
Performs PII removal, deduplication, text normalization, and outputs processed dataset.
"""

import os
import sys
import glob
import json
import csv
import datetime
from collections import Counter, defaultdict

# Ensure root workspace directory is in python path
sys.path.insert(0, os.path.abspath("."))

from ml.preprocessing.clean_text import clean_text
from ml.preprocessing.remove_pii import scrub_pii
from ml.preprocessing.handle_duplicates import deduplicate_records

RANDOM_STATE = 42

TARGET_CATEGORIES = [
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
]

def determine_category(text: str, sub_cat: str) -> str:
    combined = (sub_cat + " " + text).lower()
    
    if any(k in combined for k in ["transformer", "tc failure", "dpm"]):
        return "Transformer Fault"
    if any(k in combined for k in ["theft", "hooking", "bypass", "illegal connection"]):
        return "Power Theft / Unauthorized Connection"
    if any(k in combined for k in ["low voltage", "voltage fluctuation", "dim light", "voltage drop"]):
        return "Voltage Fluctuation / Low Voltage"
    if any(k in combined for k in ["meter fast", "meter slow", "meter jump", "faulty meter", "meter display"]):
        return "Meter Issues"
    if any(k in combined for k in ["bill", "tariff", "overcharge", "payment", "reading wrong"]):
        return "Billing and Payment"
    if any(k in combined for k in ["new connection", "load extension", "shifting of meter"]):
        return "New Connection / Service Request"
    if any(k in combined for k in ["fallen pole", "hanging wire", "live wire", "snapped", "shock hazard", "earthing"]):
        return "Pole / Wire / Electrical Hazard"
    if any(k in combined for k in ["street light", "park light", "junction box", "feeder pillar"]):
        return "Street/Public Electrical Infrastructure"
    if any(k in combined for k in ["power cut", "no supply", "no electricity", "blackout", "feeder trip", "interruption", "current gone"]):
        return "Power Outage / No Supply"
        
    return "General Consumer Services"

def run_preprocessing_pipeline():
    print("=" * 80)
    print("STARTING GRIEVANCEHUB REAL DATA PREPROCESSING PIPELINE")
    print("=" * 80)
    
    start_time = datetime.datetime.now()
    
    # 1. Load Raw Indian OpenCity Datasets
    ind_files = sorted(glob.glob("ml/datasets/raw/indian_opencity/batch_*.json"))
    raw_ind_records = []
    for f in ind_files:
        with open(f, 'r', encoding='utf-8') as fp:
            raw_ind_records.extend(json.load(fp))
            
    total_raw = len(raw_ind_records)
    print(f"Loaded Raw Indian OpenCity Records: {total_raw} (from {len(ind_files)} files)")
    print(f"NYC 311 Dataset Status: EXCLUDED FROM FINAL CLASSIFIER (Phase 5 Compliance)")
    print(f"Synthetic Data Status: 0 RECORDS (Phase 4 Compliance)")
    
    valid_records = []
    pii_totals = defaultdict(int)
    
    for r in raw_ind_records:
        comp_id = r.get("Complaint ID") or r.get("_id")
        if not comp_id:
            continue
            
        sub_cat = r.get("Sub Category", "").strip()
        cat = r.get("Category", "").strip()
        ward = clean_text(r.get("Ward Name", ""))
        remarks = r.get("Staff Remarks", "")
        staff = clean_text(r.get("Staff Name", ""))
        
        if remarks in ["\\N", "None", None]:
            remarks = ""
        else:
            remarks = str(remarks).strip()
            
        text_parts = [sub_cat]
        if ward and ward.lower() != "unknown":
            text_parts.append(f"in {ward}")
        if remarks and remarks.lower() != "1st assignment based on ward mapping":
            text_parts.append(remarks)
        elif staff and "/" in staff:
            designation = staff.split("/", 1)[1].strip()
            text_parts.append(f"Field inspection assigned to {designation} officer.")
            
        raw_text = " ".join(text_parts)
        cleaned = clean_text(raw_text)
        scrubbed_text, pii = scrub_pii(cleaned)
        
        for k, v in pii.items():
            pii_totals[k] += v
            
        if not scrubbed_text or len(scrubbed_text) < 10:
            continue
            
        target_category = determine_category(scrubbed_text, sub_cat)
        
        valid_records.append({
            "source_dataset": "INDIAN_OPENCITY_BBMP",
            "source_record_id": str(comp_id),
            "record_id": str(comp_id),
            "complaint_text": scrubbed_text,
            "source_category": cat,
            "source_subcategory": sub_cat,
            "target_category": target_category,
            "mapping_status": "DIRECT_MATCH",
            "agency": clean_text(r.get("Staff Name", "BBMP Municipal Ward Office")),
            "location": {
                "ward_or_borough": ward,
                "address": None,
                "zip_code": None,
                "latitude": None,
                "longitude": None
            },
            "created_date": r.get("Grievance Date"),
            "status": r.get("Grievance Status", "Registered")
        })
        
    print(f"\n[Validation] Valid scrubbed records before deduplication: {len(valid_records)}")
    
    # Deduplicate
    unique_records, dedup_meta = deduplicate_records(valid_records)
    print(f"[Deduplication] Unique records retained: {len(unique_records)} (Removed {dedup_meta['exact_text_duplicates_removed']} duplicates)")
    
    # Save outputs
    out_dir = "ml/datasets/processed"
    os.makedirs(out_dir, exist_ok=True)
    
    json_path = os.path.join(out_dir, "grievancehub_training_dataset.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(unique_records, f, indent=2, ensure_ascii=False)
        
    csv_path = os.path.join(out_dir, "grievancehub_training_dataset.csv")
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["record_id", "source_dataset", "target_category", "source_subcategory", "complaint_text", "status", "created_date"])
        writer.writeheader()
        for r in unique_records:
            writer.writerow({
                "record_id": r["record_id"],
                "source_dataset": r["source_dataset"],
                "target_category": r["target_category"],
                "source_subcategory": r["source_subcategory"],
                "complaint_text": r["complaint_text"],
                "status": r["status"],
                "created_date": r["created_date"]
            })
            
    cat_counts = Counter(r["target_category"] for r in unique_records)
    
    metadata = {
        "dataset_version": "1.0.0",
        "creation_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_datasets": ["Indian OpenCity BBMP Electrical Sub-Domain (Real Public Grievances)"],
        "total_raw_records": total_raw,
        "valid_records_before_dedup": len(valid_records),
        "unique_records_retained": len(unique_records),
        "deduplication_summary": dedup_meta,
        "pii_summary": dict(pii_totals),
        "target_categories": TARGET_CATEGORIES,
        "class_distribution": {c: {"count": cat_counts[c], "percentage": round(cat_counts[c]/len(unique_records)*100, 2)} for c in TARGET_CATEGORIES},
        "random_state": RANDOM_STATE
    }
    
    meta_path = os.path.join(out_dir, "dataset_metadata.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n[Export] Saved dataset to {json_path} and {csv_path}")
    print(f"[Export] Saved dataset metadata to {meta_path}")
    print("=" * 80)
    print("PREPROCESSING PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    run_preprocessing_pipeline()
