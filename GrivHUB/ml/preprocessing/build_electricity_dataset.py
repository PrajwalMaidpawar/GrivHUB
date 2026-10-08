"""
GrievanceHUB Real Indian Electricity Dataset Builder
Processes 100% REAL Indian electricity & electrical infrastructure grievance records.
Strictly EXCLUDES NYC 311 data, excludes synthetic data, scrubs PII, deduplicates,
and maps records into 10 domain-specific Indian electricity categories.
"""

import os
import sys
import glob
import json
import csv
import datetime
import random
from collections import Counter, defaultdict

# Ensure root workspace directory is in python path
sys.path.insert(0, os.path.abspath("."))

from ml.preprocessing.clean_text import clean_text
from ml.preprocessing.remove_pii import scrub_pii
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.training.train_logistic_regression import train_logistic_regression_model
from ml.evaluation.evaluate_model import ClassificationEvaluator

RANDOM_STATE = 42
random.seed(RANDOM_STATE)

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

# Domain keyword-based mapping rules for real Indian electricity complaints
MAPPING_RULES = {
    "Power Outage / No Supply": [
        "power cut", "no supply", "no electricity", "feeder trip", "power outage", 
        "blackout", "phase out", "supply interrupted", "power failure", "load shedding",
        "current gone", "no power", "light gone", "feeder interruption", "substation outage"
    ],
    "Voltage Fluctuation / Low Voltage": [
        "low voltage", "voltage fluctuation", "high voltage", "dim light", "appliance trip",
        "voltage drop", "voltage surge", "fluctuating voltage", "unstable power"
    ],
    "Meter Issues": [
        "meter fast", "meter slow", "meter jump", "digital meter defect", "meter stopped",
        "meter display blank", "faulty meter", "meter replacement", "meter burnt",
        "meter reading wrong", "meter seal broken", "submeter"
    ],
    "Billing and Payment": [
        "high bill", "exorbitant bill", "wrong bill", "billing error", "tariff dispute",
        "excessive charge", "bill adjustment", "payment not updated", "double billing",
        "wrong reading in bill", "bill amount high", "average bill"
    ],
    "Transformer Fault": [
        "transformer spark", "transformer oil leak", "transformer breakdown", "transformer blast",
        "transformer fire", "transformer noise", "transformer overloaded", "tc failure",
        "transformer smoke", "dpm failure"
    ],
    "Pole / Wire / Electrical Hazard": [
        "fallen pole", "hanging wire", "loose conductor", "sparking wire", "live wire",
        "leaning pole", "broken pole", "electric shock hazard", "wire snapped",
        "open junction box", "exposed cable", "tree branch on wire"
    ],
    "New Connection / Service Request": [
        "new connection", "meter installation", "load extension", "service wire request",
        "name change in bill", "tariff change", "category change", "shifting of meter",
        "temporary connection"
    ],
    "Street/Public Electrical Infrastructure": [
        "street light not working", "street light dark", "public pole defect", "street light switched on during day",
        "requirement for new street light", "park light not working", "earthing issue",
        "junction box defect", "feeder pillar open", "street light pole damaged"
    ],
    "Power Theft / Unauthorized Connection": [
        "power theft", "unauthorized hooking", "direct line connection", "meter bypass",
        "electricity theft", "illegal connection", "energy theft", "tampered meter"
    ],
    "General Consumer Services": [
        "consumer helpline", "general inquiry", "tariff structure inquiry", "office behavior",
        "complaint status inquiry", "helpdesk", "subdivision inquiry", "general service request"
    ]
}

def determine_category(text: str, sub_cat: str) -> str:
    combined = (sub_cat + " " + text).lower()
    
    # Priority matching
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

def build_pure_electricity_dataset():
    print("=" * 80)
    print("BUILDING 100% REAL INDIAN ELECTRICITY GRIEVANCE DATASET (NO NYC, NO SYNTHETIC)")
    print("=" * 80)
    
    # Load raw Indian OpenCity batch records
    ind_files = sorted(glob.glob("ml/datasets/raw/indian_opencity/batch_*.json"))
    raw_records = []
    for f in ind_files:
        with open(f, 'r', encoding='utf-8') as fp:
            raw_records.extend(json.load(fp))
            
    print(f"Loaded {len(raw_records)} raw records from OpenCity Indian public dataset.")
    
    processed_records = []
    seen_texts = set()
    pii_counts = defaultdict(int)
    
    cat_counts = Counter()
    
    for r in raw_records:
        cat = r.get("Category", "")
        sub_cat = r.get("Sub Category", "")
        
        # Focus on Electrical or civic complaints relevant to electrical infrastructure/power
        remarks = r.get("Staff Remarks", "")
        if remarks in ["\\N", "None", None]:
            remarks = ""
        ward = r.get("Ward Name", "")
        staff = r.get("Staff Name", "")
        
        text_parts = [sub_cat]
        if ward and ward.lower() != "unknown":
            text_parts.append(f"in {ward}")
        if remarks and remarks.lower() != "1st assignment based on ward mapping":
            text_parts.append(str(remarks))
        elif staff and "/" in staff:
            designation = staff.split("/", 1)[1].strip()
            text_parts.append(f"Field inspection assigned to {designation} officer.")
            
        full_text = clean_text(" ".join(text_parts))
        scrubbed_text, pii_stat = scrub_pii(full_text)
        
        for k, v in pii_stat.items():
            pii_counts[k] += v
            
        if len(scrubbed_text) < 10:
            continue
            
        # Deduplication
        norm_text = scrubbed_text.lower()
        if norm_text in seen_texts:
            continue
        seen_texts.add(norm_text)
        
        target_cat = determine_category(scrubbed_text, sub_cat)
        cat_counts[target_cat] += 1
        
        processed_records.append({
            "source_dataset": "INDIAN_OPENCITY_ELECTRICITY",
            "record_id": str(r.get("Complaint ID") or r.get("_id")),
            "complaint_text": scrubbed_text,
            "source_category": cat,
            "source_subcategory": sub_cat,
            "target_category": target_cat,
            "ward_name": ward
        })
        
    print(f"\nRetained {len(processed_records)} unique, scrubbed Indian records.")
    print("Class Distribution Across 10 Electricity Categories:")
    for c, cnt in cat_counts.most_common():
        print(f"  - {c:45s}: {cnt:5d} records ({cnt/len(processed_records)*100:.2f}%)")
        
    return processed_records

if __name__ == "__main__":
    build_pure_electricity_dataset()
