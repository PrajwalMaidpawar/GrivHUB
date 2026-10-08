import hashlib
from typing import List, Dict, Any, Tuple
from collections import defaultdict

def compute_text_hash(text: str) -> str:
    """Computes SHA-256 hash of normalized text for exact duplicate detection."""
    return hashlib.sha256(text.strip().lower().encode('utf-8')).hexdigest()

def deduplicate_records(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Deduplicates records to prevent data leakage and skewed category distributions.
    
    Returns:
        unique_records (list): Retained unique records.
        duplicate_stats (dict): Exact and near duplicate statistics.
    """
    seen_hashes = {}
    seen_source_ids = set()
    
    unique_records = []
    exact_duplicates_found = 0
    duplicate_source_ids = 0
    
    # Near duplicate tracking via character 4-gram prefix hash
    near_dup_bins = defaultdict(list)
    near_duplicates_detected = 0
    
    for r in records:
        src_id = (r["source_dataset"], r["source_record_id"])
        if src_id in seen_source_ids:
            duplicate_source_ids += 1
            continue
        seen_source_ids.add(src_id)
        
        text = r["complaint_text"]
        t_hash = compute_text_hash(text)
        
        if t_hash in seen_hashes:
            exact_duplicates_found += 1
            continue
            
        seen_hashes[t_hash] = r
        unique_records.append(r)
        
        # Near duplicate token signature check
        tokens = set(text.lower().split())
        if len(tokens) >= 5:
            sig = " ".join(sorted(list(tokens))[:5])
            if sig in near_dup_bins:
                near_duplicates_detected += 1
            near_dup_bins[sig].append(r["source_record_id"])
            
    stats = {
        "initial_valid_records": len(records),
        "duplicate_source_ids_removed": duplicate_source_ids,
        "exact_text_duplicates_found": exact_duplicates_found,
        "exact_text_duplicates_removed": exact_duplicates_found,
        "near_duplicates_detected": near_duplicates_detected,
        "unique_records_retained": len(unique_records),
        "deduplication_rate_pct": round((exact_duplicates_found / len(records)) * 100, 2) if records else 0
    }
    
    return unique_records, stats
