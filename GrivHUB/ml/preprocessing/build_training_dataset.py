import csv
import json
import os
from typing import List, Dict, Any

def export_training_dataset(records: List[Dict[str, Any]], 
                            output_csv_path: str = "ml/datasets/processed/grievancehub_training_dataset.csv",
                            output_json_path: str = "ml/datasets/processed/grievancehub_training_dataset.json",
                            output_sample_path: str = "ml/datasets/samples/sample_training_records.json"):
    """
    Exports the validated, cleaned, and deduplicated records to standardized storage formats.
    """
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    os.makedirs(os.path.dirname(output_sample_path), exist_ok=True)
    
    # 1. Assign sequential GrievanceHUB IDs
    processed_records = []
    for idx, r in enumerate(records, start=1):
        abbr = "IND" if r["source_dataset"] == "INDIAN_OPENCITY_BBMP" else "NYC"
        rec_copy = dict(r)
        rec_copy["record_id"] = f"GHUB_{abbr}_{idx:06d}"
        processed_records.append(rec_copy)
        
    # 2. Export CSV
    csv_fieldnames = [
        "record_id",
        "source_dataset",
        "source_record_id",
        "complaint_text",
        "target_category",
        "agency",
        "ward_or_borough",
        "incident_address",
        "incident_zip",
        "latitude",
        "longitude",
        "created_date",
        "status"
    ]
    
    with open(output_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fieldnames)
        writer.writeheader()
        for r in processed_records:
            loc = r.get("location", {}) or {}
            writer.writerow({
                "record_id": r["record_id"],
                "source_dataset": r["source_dataset"],
                "source_record_id": r["source_record_id"],
                "complaint_text": r["complaint_text"],
                "target_category": r["target_category"],
                "agency": r.get("agency", ""),
                "ward_or_borough": loc.get("ward_or_borough", ""),
                "incident_address": loc.get("address", ""),
                "incident_zip": loc.get("zip_code", ""),
                "latitude": loc.get("latitude", ""),
                "longitude": loc.get("longitude", ""),
                "created_date": r.get("created_date", ""),
                "status": r.get("status", "")
            })
            
    # 3. Export full JSON
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(processed_records, f, indent=2, ensure_ascii=False)
        
    # 4. Export Representative Samples (5 per category)
    samples_by_cat = {}
    for r in processed_records:
        cat = r["target_category"]
        if cat not in samples_by_cat:
            samples_by_cat[cat] = []
        if len(samples_by_cat[cat]) < 5:
            samples_by_cat[cat].append(r)
            
    with open(output_sample_path, "w", encoding="utf-8") as f:
        json.dump(samples_by_cat, f, indent=2, ensure_ascii=False)
        
    print(f"Exported {len(processed_records)} records to {output_csv_path} and {output_json_path}")
    return processed_records
