import os
import json
import glob
import csv
from collections import Counter, defaultdict

def load_all_json_files(pattern):
    files = sorted(glob.glob(pattern))
    records = []
    total_size_bytes = 0
    for fpath in files:
        total_size_bytes += os.path.getsize(fpath)
        with open(fpath, 'r', encoding='utf-8') as f:
            records.extend(json.load(f))
    return records, files, total_size_bytes

def inspect_dataset_records(records, dataset_name):
    total_records = len(records)
    if total_records == 0:
        return {"total_records": 0}
    
    # Analyze columns and types
    column_counts = Counter()
    missing_counts = defaultdict(int)
    unique_values = defaultdict(set)
    types_map = defaultdict(set)
    
    for r in records:
        for k, v in r.items():
            column_counts[k] += 1
            if v is None or v == "" or v == "N/A" or v == "\\N":
                missing_counts[k] += 1
            else:
                if len(unique_values[k]) < 500: # cap memory for unique sets
                    unique_values[k].add(str(v))
            types_map[k].add(type(v).__name__)
            
        # check keys not present in r
        for col in column_counts.keys():
            if col not in r:
                missing_counts[col] += 1
                
    columns = list(column_counts.keys())
    
    return {
        "dataset_name": dataset_name,
        "total_records": total_records,
        "columns": columns,
        "column_presence": dict(column_counts),
        "missing_counts": dict(missing_counts),
        "types_map": {k: list(v) for k, v in types_map.items()},
        "unique_counts": {k: len(v) for k, v in unique_values.items()},
        "sample_records": records[:3]
    }

def main():
    # 1. Load NYC 311
    nyc_records, nyc_files, nyc_size = load_all_json_files("ml/datasets/raw/nyc_311/nyc311_*.json")
    nyc_inspection = inspect_dataset_records(nyc_records, "NYC 311 Service Requests")
    nyc_inspection["files"] = [os.path.basename(f) for f in nyc_files]
    nyc_inspection["total_size_bytes"] = nyc_size
    nyc_inspection["total_size_mb"] = round(nyc_size / (1024 * 1024), 2)
    
    # 2. Load Indian OpenCity
    ind_records, ind_files, ind_size = load_all_json_files("ml/datasets/raw/indian_opencity/batch_*.json")
    ind_inspection = inspect_dataset_records(ind_records, "Indian OpenCity BBMP Sahaaya Grievances")
    ind_inspection["files"] = [os.path.basename(f) for f in ind_files]
    ind_inspection["total_size_bytes"] = ind_size
    ind_inspection["total_size_mb"] = round(ind_size / (1024 * 1024), 2)
    
    # Save raw inspection summary json
    with open("ml/reports/raw_dataset_inspection.json", "w", encoding="utf-8") as f:
        json.dump({"nyc_311": nyc_inspection, "indian_opencity": ind_inspection}, f, indent=2, ensure_ascii=False)
        
    print(f"Loaded NYC 311: {len(nyc_records)} records across {len(nyc_files)} files ({nyc_inspection['total_size_mb']} MB)")
    print(f"Loaded Indian OpenCity: {len(ind_records)} records across {len(ind_files)} files ({ind_inspection['total_size_mb']} MB)")

if __name__ == "__main__":
    main()
