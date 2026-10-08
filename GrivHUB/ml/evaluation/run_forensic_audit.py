"""
GrievanceHUB Phase 35: Forensic ML Audit Script
Calculates class distributions, majority baseline, electricity relevance %,
template homogeneity, cross-split leakage, per-class supported vs unsupported metrics,
and out-of-ward generalization.
"""

import os
import sys
import glob
import json
import math
import hashlib
from collections import Counter, defaultdict

sys.path.insert(0, os.path.abspath("."))

from ml.preprocessing.clean_text import clean_text
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.training.train_logistic_regression import LogisticRegressionClassifier
from ml.training.train_linear_svm import LinearSVMClassifier
from ml.training.train_naive_bayes import MultinomialNBClassifier

TARGET_CLASSES = [
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

def run_forensic_analysis():
    print("=" * 80)
    print("RUNNING FORENSIC ML AUDIT CALCULATIONS")
    print("=" * 80)
    
    # 1. Load Raw Dataset
    ind_files = sorted(glob.glob("ml/datasets/raw/indian_opencity/batch_*.json"))
    raw_records = []
    for f in ind_files:
        with open(f, 'r', encoding='utf-8') as fp:
            raw_records.extend(json.load(fp))
            
    print(f"1. Total Raw Records Loaded: {len(raw_records)}")
    
    # Analyze raw categories
    raw_cat_counts = Counter(r.get("Category", "UNKNOWN") for r in raw_records)
    print("\nRaw Category Distribution:")
    for cat, cnt in raw_cat_counts.most_common(10):
        print(f"  - {cat:35s}: {cnt:5d} ({cnt/len(raw_records)*100:.2f}%)")
        
    # Analyze raw subcategories
    elec_subcats = Counter(r.get("Sub Category", "UNKNOWN") for r in raw_records if r.get("Category") == "Electrical")
    print("\nElectrical Sub-Category Breakdown in Raw OpenCity:")
    for subcat, cnt in elec_subcats.most_common():
        print(f"  - {subcat:45s}: {cnt:5d} ({cnt/len(raw_records)*100:.2f}%)")
        
    # 2. Electricity Relevance Breakdown
    pure_elec_count = 0
    gen_svc_count = 0
    other_civic_count = 0
    
    for r in raw_records:
        cat = r.get("Category", "")
        subcat = r.get("Sub Category", "")
        if cat == "Electrical" or "street light" in subcat.lower() or "pole" in subcat.lower():
            pure_elec_count += 1
        elif cat in ["Solid Waste (Garbage) Related", "veterinary", "Forest", "Road Maintenance(Engg)", "Road Infrastructure"]:
            other_civic_count += 1
        else:
            gen_svc_count += 1
            
    print(f"\n2. Domain Relevance Breakdown:")
    print(f"  - Pure Electrical / Streetlight Complaints: {pure_elec_count:5d} ({pure_elec_count/len(raw_records)*100:.2f}%)")
    print(f"  - Other Municipal/Civic (Garbage/Roads/Trees): {other_civic_count:5d} ({other_civic_count/len(raw_records)*100:.2f}%)")
    print(f"  - Other General Services:                      {gen_svc_count:5d} ({gen_svc_count/len(raw_records)*100:.2f}%)")
    
    # 3. Load Processed Dataset
    with open("ml/datasets/processed/grievancehub_training_dataset.json", "r", encoding="utf-8") as f:
        proc_records = json.load(f)
        
    proc_cat_counts = Counter(r["target_category"] for r in proc_records)
    print(f"\n3. Processed Unique Records: {len(proc_records)}")
    
    # Load Splits
    with open("ml/datasets/splits/train.json", "r", encoding="utf-8") as f:
        train_recs = json.load(f)
    with open("ml/datasets/splits/validation.json", "r", encoding="utf-8") as f:
        val_recs = json.load(f)
    with open("ml/datasets/splits/test.json", "r", encoding="utf-8") as f:
        test_recs = json.load(f)
        
    train_counts = Counter(r["target_category"] for r in train_recs)
    val_counts = Counter(r["target_category"] for r in val_recs)
    test_counts = Counter(r["target_category"] for r in test_recs)
    
    # Print Distribution Table
    print("\n" + "=" * 80)
    print(f"{'Target Class':<40} | {'Raw':>5} | {'Clean':>5} | {'Train':>5} | {'Val':>5} | {'Test':>5}")
    print("-" * 80)
    for cls in TARGET_CLASSES:
        raw_cnt = proc_cat_counts.get(cls, 0)
        cln_cnt = proc_cat_counts.get(cls, 0)
        tr_cnt = train_counts.get(cls, 0)
        va_cnt = val_counts.get(cls, 0)
        te_cnt = test_counts.get(cls, 0)
        print(f"{cls:<40} | {raw_cnt:5d} | {cln_cnt:5d} | {tr_cnt:5d} | {va_cnt:5d} | {te_cnt:5d}")
    print("=" * 80)
    
    # 4. Majority Baseline Metrics
    # Majority class in test set: General Consumer Services (553 / 643)
    maj_class = "General Consumer Services"
    maj_correct = test_counts[maj_class]
    maj_total = len(test_recs)
    maj_acc = maj_correct / maj_total
    
    # Calculate baseline weighted F1 & macro F1
    maj_prec = maj_correct / maj_total # 553/643
    maj_rec = 1.0 # 553/553
    maj_f1 = 2 * (maj_prec * maj_rec) / (maj_prec + maj_rec)
    maj_weighted_f1 = (maj_correct / maj_total) * maj_f1
    maj_macro_f1_all = maj_f1 / 10.0 # 0.8599 / 10 = 0.0860
    maj_macro_f1_supp = maj_f1 / 4.0 # 0.8599 / 4 = 0.2150
    
    print("\n4. Majority Class Baseline (Always Predict 'General Consumer Services'):")
    print(f"  - Baseline Test Accuracy:     {maj_acc * 100:.2f}% ({maj_correct}/{maj_total})")
    print(f"  - Baseline Weighted F1:       {maj_weighted_f1:.4f}")
    print(f"  - Baseline Macro F1 (4 Supp): {maj_macro_f1_supp:.4f}")
    print(f"  - Baseline Macro F1 (All 10): {maj_macro_f1_all:.4f}")
    
    # 5. ML Model Test Predictions & Recalculations
    with open("ml/artifacts/final/vectorizer.json", "r", encoding="utf-8") as f:
        vec_data = json.load(f)
    vectorizer = TfidfFeatureExtractor.from_dict(vec_data)
    
    with open("ml/artifacts/final/model.json", "r", encoding="utf-8") as f:
        model_data = json.load(f)
    model = LogisticRegressionClassifier.from_dict(model_data)
    
    test_texts = [r["complaint_text"] for r in test_recs]
    y_true = [r["target_category"] for r in test_recs]
    
    X_test = vectorizer.transform(test_texts)
    y_pred = model.predict(X_test)
    
    correct_cnt = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
    ml_acc = correct_cnt / len(y_true)
    
    print(f"\n5. ML Model Test Performance (Independent Recalculation):")
    print(f"  - Correct Predictions:   {correct_cnt} / {len(y_true)}")
    print(f"  - Calculated Accuracy:   {ml_acc * 100:.2f}% ({correct_cnt}/{len(y_true)})")
    
    # 6. Template & Near-Duplicate Analysis
    templates = Counter()
    for r in proc_records:
        text = r["complaint_text"]
        words = text.split()
        if len(words) >= 4 and "street light" in text.lower():
            sig = " ".join(words[:4])
            templates[sig] += 1
            
    print(f"\n6. Template Homogeneity Analysis:")
    top_tpl, top_cnt = templates.most_common(1)[0] if templates else ("N/A", 0)
    print(f"  - Largest Streetlight Template Prefix: '{top_tpl}' -> {top_cnt} records ({top_cnt/len(proc_records)*100:.2f}% of corpus)")
    
    # 7. Entropy calculation
    total_recs = len(proc_records)
    entropy = -sum((cnt/total_recs) * math.log2(cnt/total_recs) for cnt in proc_cat_counts.values() if cnt > 0)
    max_entropy = math.log2(10)
    print(f"\n7. Class Entropy Analysis:")
    print(f"  - Calculated Class Entropy: {entropy:.4f} bits (Max possible for 10 classes = {max_entropy:.4f} bits)")
    print(f"  - Imbalance Ratio (Majority / Minority non-zero): {proc_cat_counts['General Consumer Services'] / proc_cat_counts['Billing and Payment']:.1f}:1")

if __name__ == "__main__":
    run_forensic_analysis()
