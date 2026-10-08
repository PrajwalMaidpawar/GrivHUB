import os
import json
import glob
import random
from collections import Counter

RANDOM_STATE = 42

def create_development_samples(sample_size=1000):
    random.seed(RANDOM_STATE)
    
    # 1. Sample from Indian OpenCity
    indian_files = glob.glob("ml/datasets/raw/indian_opencity/batch_*.json")
    all_indian_records = []
    for fpath in indian_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            all_indian_records.extend(json.load(f))
            
    print(f"Loaded {len(all_indian_records)} total raw Indian OpenCity records.")
    
    if len(all_indian_records) > sample_size:
        # Deterministic shuffle & sample
        indices = list(range(len(all_indian_records)))
        random.shuffle(indices)
        sampled_indices = indices[:sample_size]
        sampled_indian = [all_indian_records[i] for i in sampled_indices]
    else:
        sampled_indian = all_indian_records

    os.makedirs("ml/datasets/samples", exist_ok=True)
    
    with open("ml/datasets/samples/indian_opencity_sample_1000.json", "w", encoding="utf-8") as f:
        json.dump(sampled_indian, f, indent=2, ensure_ascii=False)
        
    print(f"Saved reproducible Indian OpenCity sample ({len(sampled_indian)} records) to ml/datasets/samples/indian_opencity_sample_1000.json")

    # Inspect sampled category distributions
    sampled_cats = Counter(r.get('Category') for r in sampled_indian)
    print("\nSampled Indian OpenCity Category Distribution:")
    for cat, count in sampled_cats.most_common():
        print(f"  {cat}: {count} ({count/len(sampled_indian)*100:.1f}%)")

    # 2. Sample from NYC 311 if present
    nyc_files = glob.glob("ml/datasets/raw/nyc_311/nyc311_*.json")
    all_nyc_records = []
    for fpath in nyc_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            all_nyc_records.extend(json.load(f))
            
    if all_nyc_records:
        print(f"\nLoaded {len(all_nyc_records)} total raw NYC 311 records.")
        if len(all_nyc_records) > sample_size:
            indices = list(range(len(all_nyc_records)))
            random.shuffle(indices)
            sampled_nyc = [all_nyc_records[i] for i in indices[:sample_size]]
        else:
            sampled_nyc = all_nyc_records
            
        with open("ml/datasets/samples/nyc_311_sample_1000.json", "w", encoding="utf-8") as f:
            json.dump(sampled_nyc, f, indent=2, ensure_ascii=False)
        print(f"Saved reproducible NYC 311 sample ({len(sampled_nyc)} records) to ml/datasets/samples/nyc_311_sample_1000.json")
        
        sampled_agencies = Counter(r.get('agency') for r in sampled_nyc)
        print("\nSampled NYC 311 Agency Distribution:")
        for ag, count in sampled_agencies.items():
            print(f"  {ag}: {count} ({count/len(sampled_nyc)*100:.1f}%)")

if __name__ == "__main__":
    create_development_samples(sample_size=1000)
