import json
import glob
from collections import Counter, defaultdict

def compute_coverage():
    with open("ml/mappings/indian_category_mapping.json", 'r', encoding='utf-8') as f:
        ind_map = json.load(f)
    with open("ml/mappings/nyc_category_mapping.json", 'r', encoding='utf-8') as f:
        nyc_map = json.load(f)
        
    target_categories = [
        "Water Supply",
        "Roads and Infrastructure",
        "Sanitation and Waste Management",
        "Drainage and Sewage",
        "Street Lighting and Electrical Infrastructure",
        "Parks and Environment",
        "Transportation and Traffic Infrastructure",
        "General Civic Services"
    ]
    
    ind_counts = defaultdict(lambda: {"DIRECT MATCH": 0, "POSSIBLE MATCH": 0, "AMBIGUOUS": 0, "EXCLUDED": 0, "TOTAL": 0})
    nyc_counts = defaultdict(lambda: {"DIRECT MATCH": 0, "POSSIBLE MATCH": 0, "AMBIGUOUS": 0, "EXCLUDED": 0, "TOTAL": 0})
    
    for k, info in ind_map.items():
        target = info.get("target_category")
        status = info.get("status")
        cnt = info.get("count", 0)
        if target:
            ind_counts[target][status] += cnt
            ind_counts[target]["TOTAL"] += cnt
        else:
            ind_counts["EXCLUDED_RECORDS"][status] += cnt
            ind_counts["EXCLUDED_RECORDS"]["TOTAL"] += cnt
            
    for k, info in nyc_map.items():
        target = info.get("target_category")
        status = info.get("status")
        cnt = info.get("count", 0)
        if target:
            nyc_counts[target][status] += cnt
            nyc_counts[target]["TOTAL"] += cnt
        else:
            nyc_counts["EXCLUDED_RECORDS"][status] += cnt
            nyc_counts["EXCLUDED_RECORDS"]["TOTAL"] += cnt

    coverage_report = []
    print("=" * 80)
    print(f"{'Target Category':<45} | {'Indian Direct':<12} | {'Indian Poss':<11} | {'NYC Direct':<10} | {'NYC Poss':<9} | {'Total Usable':<12}")
    print("=" * 80)
    
    for cat in target_categories:
        i_dir = ind_counts[cat]["DIRECT MATCH"]
        i_pos = ind_counts[cat]["POSSIBLE MATCH"]
        n_dir = nyc_counts[cat]["DIRECT MATCH"]
        n_pos = nyc_counts[cat]["POSSIBLE MATCH"]
        usable = i_dir + i_pos + n_dir + n_pos
        
        confidence = "Strong" if usable >= 1000 else ("Moderate" if usable >= 300 else ("Weak" if usable > 0 else "None"))
        
        coverage_report.append({
            "target_category": cat,
            "indian_direct": i_dir,
            "indian_possible": i_pos,
            "indian_total": i_dir + i_pos,
            "nyc_direct": n_dir,
            "nyc_possible": n_pos,
            "nyc_total": n_dir + n_pos,
            "total_usable_records": usable,
            "coverage_level": confidence
        })
        print(f"{cat:<45} | {i_dir:<12} | {i_pos:<11} | {n_dir:<10} | {n_pos:<9} | {usable:<12} ({confidence})")
        
    print("=" * 80)
    print(f"Indian Excluded records: {ind_counts['EXCLUDED_RECORDS']['TOTAL']}")
    print(f"NYC Excluded records: {nyc_counts['EXCLUDED_RECORDS']['TOTAL']}")
    
    with open("ml/reports/category_coverage_summary.json", "w", encoding="utf-8") as f:
        json.dump({
            "coverage_by_category": coverage_report,
            "indian_excluded_records": ind_counts['EXCLUDED_RECORDS']['TOTAL'],
            "nyc_excluded_records": nyc_counts['EXCLUDED_RECORDS']['TOTAL']
        }, f, indent=2)

if __name__ == "__main__":
    compute_coverage()
