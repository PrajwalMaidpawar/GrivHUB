import json
import glob
import re
from collections import Counter, defaultdict

def analyze_text_fields():
    # 1. Indian OpenCity text analysis
    ind_records = []
    for f in sorted(glob.glob("ml/datasets/raw/indian_opencity/batch_*.json")):
        with open(f, 'r', encoding='utf-8') as fp:
            ind_records.extend(json.load(fp))
            
    # 2. NYC 311 text analysis
    nyc_records = []
    for f in sorted(glob.glob("ml/datasets/raw/nyc_311/nyc311_*.json")):
        with open(f, 'r', encoding='utf-8') as fp:
            nyc_records.extend(json.load(fp))
            
    def compute_stats(texts, name):
        total = len(texts)
        empty_count = 0
        lengths = []
        html_tags_count = 0
        special_char_count = 0
        unique_texts = set()
        lang_latin = 0
        lang_indic = 0
        
        for t in texts:
            if not t or str(t).strip() == "" or str(t).strip() == "\\N" or str(t).strip().lower() == "n/a":
                empty_count += 1
                continue
            
            s = str(t).strip()
            unique_texts.add(s)
            lengths.append(len(s))
            
            if "<" in s and ">" in s and re.search(r"<[^>]+>", s):
                html_tags_count += 1
            if re.search(r"[@#$%^*+=~`]", s):
                special_char_count += 1
            # Check unicode script
            if re.search(r"[\u0900-\u097F\u0C80-\u0CFF]", s): # Devanagari or Kannada
                lang_indic += 1
            if re.search(r"[a-zA-Z]", s):
                lang_latin += 1
                
        valid_count = len(lengths)
        avg_len = sum(lengths) / valid_count if valid_count else 0
        min_len = min(lengths) if valid_count else 0
        max_len = max(lengths) if valid_count else 0
        
        return {
            "name": name,
            "total_records": total,
            "missing_or_empty": empty_count,
            "missing_pct": round((empty_count / total) * 100, 2),
            "valid_records": valid_count,
            "avg_length": round(avg_len, 2),
            "min_length": min_len,
            "max_length": max_len,
            "html_tags_count": html_tags_count,
            "special_char_count": special_char_count,
            "unique_text_count": len(unique_texts),
            "duplicate_text_frequency": total - len(unique_texts),
            "duplicate_rate_pct": round(((total - len(unique_texts)) / total) * 100, 2),
            "latin_english_presence_pct": round((lang_latin / valid_count) * 100, 2) if valid_count else 0,
            "indic_script_presence_pct": round((lang_indic / valid_count) * 100, 2) if valid_count else 0,
            "sample_texts": list(unique_texts)[:5]
        }
        
    # Analyze Indian fields:
    # 1. 'Sub Category'
    # 2. 'Staff Remarks'
    # 3. Combined 'Category' + 'Sub Category' + 'Staff Remarks'
    ind_subcats = [r.get('Sub Category') for r in ind_records]
    ind_remarks = [r.get('Staff Remarks') for r in ind_records]
    null_char = "\\N"
    ind_combined = [f"{r.get('Category', '')} - {r.get('Sub Category', '')}. {r.get('Staff Remarks', '') if r.get('Staff Remarks') != null_char else ''}" for r in ind_records]
    
    ind_subcat_stats = compute_stats(ind_subcats, "Indian OpenCity: 'Sub Category'")
    ind_remarks_stats = compute_stats(ind_remarks, "Indian OpenCity: 'Staff Remarks'")
    ind_combined_stats = compute_stats(ind_combined, "Indian OpenCity: Combined Text ('Category' + 'Sub Category' + 'Remarks')")
    
    # Analyze NYC fields:
    # 1. 'descriptor'
    # 2. 'complaint_type'
    # 3. 'resolution_description'
    # 4. Combined 'complaint_type' + 'descriptor' + 'resolution_description'
    nyc_descriptors = [r.get('descriptor') for r in nyc_records]
    nyc_complaints = [r.get('complaint_type') for r in nyc_records]
    nyc_resolutions = [r.get('resolution_description') for r in nyc_records]
    nyc_combined = [f"{r.get('complaint_type', '')}: {r.get('descriptor', '')}. {r.get('resolution_description', '')}" for r in nyc_records]
    
    nyc_desc_stats = compute_stats(nyc_descriptors, "NYC 311: 'descriptor'")
    nyc_comp_stats = compute_stats(nyc_complaints, "NYC 311: 'complaint_type'")
    nyc_res_stats = compute_stats(nyc_resolutions, "NYC 311: 'resolution_description'")
    nyc_combined_stats = compute_stats(nyc_combined, "NYC 311: Combined Text ('complaint_type' + 'descriptor' + 'resolution')")
    
    report_data = {
        "indian_subcategories": ind_subcat_stats,
        "indian_remarks": ind_remarks_stats,
        "indian_combined": ind_combined_stats,
        "nyc_descriptors": nyc_desc_stats,
        "nyc_complaints": nyc_comp_stats,
        "nyc_resolutions": nyc_res_stats,
        "nyc_combined": nyc_combined_stats
    }
    
    with open("ml/reports/text_quality_summary.json", "w", encoding="utf-8") as fp:
        json.dump(report_data, fp, indent=2, ensure_ascii=False)
        
    print("Text Quality Stats computed successfully.")

if __name__ == "__main__":
    analyze_text_fields()
