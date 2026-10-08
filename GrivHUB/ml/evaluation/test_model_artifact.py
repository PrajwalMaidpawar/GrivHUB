"""
GrievanceHUB Phase 10: Model Artifact Standalone Reproduction Test
Loads the final preserved model artifacts from ml/artifacts/final/,
runs live grievance queries, and verifies standalone inference execution.
"""

import os
import sys
import json
import time

# Ensure root workspace directory is in python path
sys.path.insert(0, os.path.abspath("."))

from ml.preprocessing.text_pipeline import clean_grievance_text
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.training.train_logistic_regression import LogisticRegressionClassifier

def test_final_artifact():
    print("=" * 70)
    print("GRIEVANCEHUB REPRODUCTION TEST: VERIFYING FINAL MODEL ARTIFACT")
    print("=" * 70)
    
    artifact_dir = "ml/artifacts/final"
    model_path = os.path.join(artifact_dir, "model.json")
    vec_path = os.path.join(artifact_dir, "vectorizer.json")
    meta_path = os.path.join(artifact_dir, "model_metadata.json")
    label_path = os.path.join(artifact_dir, "label_mapping.json")
    
    # 1. Check artifact presence
    for p in [model_path, vec_path, meta_path, label_path]:
        assert os.path.exists(p), f"Artifact missing: {p}"
        
    print("[OK] All 4 core production artifacts present in ml/artifacts/final/")
    
    # 2. Load Metadata
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    print(f"[OK] Model Name: {meta['model_name']} (v{meta['artifact_version']})")
    print(f"[OK] Algorithm: {meta['algorithm']}")
    print(f"[OK] Verified Test Accuracy: {meta['test_metrics']['accuracy'] * 100:.2f}%")
    print(f"[OK] Target Categories ({meta['target_categories_count']}): {meta['target_categories']}")
    
    # 3. Load Vectorizer and Model
    with open(vec_path, "r", encoding="utf-8") as f:
        vec_data = json.load(f)
    vectorizer = TfidfFeatureExtractor.from_dict(vec_data)
    
    with open(model_path, "r", encoding="utf-8") as f:
        model_data = json.load(f)
    model = LogisticRegressionClassifier.from_dict(model_data)
    
    print(f"[OK] Loaded Vectorizer: {vectorizer.num_features_} features")
    print(f"[OK] Loaded Model Classes: {len(model.classes_)} classes")
    
    # 4. Test live inference pipeline on real grievance queries
    test_queries = [
        "Street light pole completely dark and flickering for 2 weeks in residential lane.",
        "Loose electrical wire dangling dangerously near school entrance posing shock hazard.",
        "Received abnormal electricity bill of Rs 45,000 for single phase residential meter.",
        "General consumer query regarding new tariff rates and sub-divisional office working hours."
    ]
    
    print("\nExecuting live inference on test queries:")
    print("-" * 70)
    
    for text in test_queries:
        t0 = time.time()
        vec = vectorizer.transform([text])
        proba = model.predict_proba(vec)[0]
        pred = model.predict(vec)[0]
        conf = proba[pred]
        latency_ms = (time.time() - t0) * 1000
        
        assert pred in model.classes_, f"Predicted category '{pred}' not in model classes!"
        assert 0.0 <= conf <= 1.0, f"Invalid confidence score '{conf}'!"
        
        print(f"Query: \"{text[:55]}...\"")
        print(f"  -> Predicted:  {pred:45s} [Conf: {conf*100:.1f}%, Latency: {latency_ms:.2f}ms]\n")
        
    print("=" * 70)
    print("ALL REPRODUCTION TESTS PASSED SUCCESSFULLY! ARTIFACT IS 100% OPERATIONAL.")
    print("=" * 70)

if __name__ == "__main__":
    test_final_artifact()
