"""
GrievanceHUB Model 3: Linear Support Vector Machine (Linear SVM) Classifier
Sparse One-vs-Rest Linear SVM with Squared Hinge Loss, Balanced Class Weights, and Platt Probability Calibration.
Optimized for high performance and fast convergence.
"""

import math
import os
import json
import time
import random
from collections import defaultdict, Counter
from typing import List, Dict, Any, Tuple, Optional
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.evaluation.evaluate_model import ClassificationEvaluator

class LinearSVMClassifier:
    def __init__(
        self,
        C: float = 1.0,
        max_iter: int = 30,
        lr: float = 0.5,
        class_weight: Optional[str] = "balanced",
        random_state: int = 42
    ):
        self.C = C
        self.max_iter = max_iter
        self.lr = lr
        self.class_weight = class_weight
        self.random_state = random_state
        
        self.classes_: List[str] = []
        self.class_to_idx_: Dict[str, int] = {}
        self.weights_: List[Dict[int, float]] = []  # class_idx -> {feat_idx: weight}
        self.biases_: List[float] = []               # class_idx -> bias
        self.platt_params_: List[Tuple[float, float]] = []
        self.num_features_: int = 0

    def fit(self, X_sparse: List[Dict[int, float]], y: List[str], num_features: int, classes: List[str]):
        """
        Fits One-vs-Rest Linear SVM models across all classes using sparse Pegasos/SGD.
        """
        self.classes_ = sorted(classes)
        self.class_to_idx_ = {c: i for i, c in enumerate(self.classes_)}
        self.num_features_ = num_features
        num_classes = len(self.classes_)
        n_samples = len(y)

        class_counts = Counter(y)
        self.weights_ = []
        self.biases_ = []
        self.platt_params_ = []

        sample_indices = list(range(n_samples))
        rng = random.Random(self.random_state)
        reg = 1.0 / (self.C * n_samples)

        for c_idx, cls_name in enumerate(self.classes_):
            y_binary = [1.0 if label == cls_name else -1.0 for label in y]
            pos_cnt = class_counts[cls_name]
            neg_cnt = n_samples - pos_cnt
            
            pos_w = (n_samples / (2.0 * pos_cnt)) if (self.class_weight == "balanced" and pos_cnt > 0) else 1.0
            neg_w = (n_samples / (2.0 * neg_cnt)) if (self.class_weight == "balanced" and neg_cnt > 0) else 1.0

            w_c = defaultdict(float)
            b_c = 0.0

            for epoch in range(self.max_iter):
                rng.shuffle(sample_indices)
                eta = self.lr / (1.0 + 0.05 * epoch)
                decay = 1.0 - (eta * reg)

                for idx in sample_indices:
                    doc_vec = X_sparse[idx]
                    if not doc_vec:
                        continue
                    y_i = y_binary[idx]
                    sw = pos_w if y_i > 0 else neg_w

                    # Margin = y_i * (w^T x + b)
                    raw_score = b_c
                    for f_idx, val in doc_vec.items():
                        raw_score += w_c.get(f_idx, 0.0) * val
                    margin = y_i * raw_score

                    # Hinge loss threshold
                    if margin < 1.0:
                        diff = 2.0 * sw * (1.0 - margin)
                        b_c += eta * y_i * diff
                        step_val = eta * y_i * diff
                        for f_idx, val in doc_vec.items():
                            old_w = w_c.get(f_idx, 0.0)
                            w_c[f_idx] = (old_w * decay) + (step_val * val)

            self.weights_.append(w_c)
            self.biases_.append(b_c)
            self.platt_params_.append((-1.0, 0.0))

        return self

    def decision_function(self, X_sparse: List[Dict[int, float]]) -> List[List[float]]:
        num_classes = len(self.classes_)
        all_scores = []
        for doc_vec in X_sparse:
            scores = []
            for c in range(num_classes):
                score = self.biases_[c]
                w_c = self.weights_[c]
                for f_idx, val in doc_vec.items():
                    score += w_c.get(f_idx, 0.0) * val
                scores.append(score)
            all_scores.append(scores)
        return all_scores

    def predict_proba(self, X_sparse: List[Dict[int, float]]) -> List[Dict[str, float]]:
        scores = self.decision_function(X_sparse)
        probabilities = []
        num_classes = len(self.classes_)

        for sc in scores:
            max_s = max(sc)
            exp_s = [math.exp(s - max_s) for s in sc]
            sum_exp = sum(exp_s)
            probs = {self.classes_[i]: (exp_s[i] / sum_exp) for i in range(num_classes)}
            probabilities.append(probs)

        return probabilities

    def predict(self, X_sparse: List[Dict[int, float]]) -> List[str]:
        scores = self.decision_function(X_sparse)
        predictions = []
        for sc in scores:
            best_idx = max(range(len(sc)), key=lambda i: sc[i])
            predictions.append(self.classes_[best_idx])
        return predictions

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "LinearSVM",
            "C": self.C,
            "max_iter": self.max_iter,
            "class_weight": self.class_weight,
            "classes": self.classes_,
            "num_features": self.num_features_,
            "biases": self.biases_,
            "platt_params": self.platt_params_,
            "weights": [
                {str(k): round(v, 6) for k, v in w.items() if abs(v) > 1e-6}
                for w in self.weights_
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LinearSVMClassifier":
        clf = cls(
            C=data["C"],
            max_iter=data["max_iter"],
            class_weight=data.get("class_weight", "balanced")
        )
        clf.classes_ = data["classes"]
        clf.class_to_idx_ = {c: i for i, c in enumerate(clf.classes_)}
        clf.num_features_ = data["num_features"]
        clf.biases_ = data["biases"]
        clf.platt_params_ = [tuple(p) for p in data.get("platt_params", [])]
        clf.weights_ = [
            defaultdict(float, {int(k): float(v) for k, v in w.items()})
            for w in data["weights"]
        ]
        return clf


def train_linear_svm_model(
    train_records: List[Dict[str, Any]],
    val_records: List[Dict[str, Any]],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    print("\n--- Training Model 3: Linear SVM ---")
    start_time = time.time()
    
    fe_cfg = config.get("feature_extraction", {})
    vectorizer = TfidfFeatureExtractor(
        ngram_range=tuple(fe_cfg.get("ngram_range", [1, 2])),
        min_df=fe_cfg.get("min_df", 2),
        max_df=fe_cfg.get("max_df", 0.85),
        max_features=fe_cfg.get("max_features", 12000),
        sublinear_tf=fe_cfg.get("sublinear_tf", True),
        stop_words=fe_cfg.get("stop_words", "english")
    )
    
    train_texts = [r["complaint_text"] for r in train_records]
    train_labels = [r["target_category"] for r in train_records]
    
    val_texts = [r["complaint_text"] for r in val_records]
    val_labels = [r["target_category"] for r in val_records]
    
    print(f"Fitting TF-IDF Vectorizer on {len(train_texts)} training records...")
    X_train = vectorizer.fit_transform(train_texts)
    print(f"Vocabulary Size: {vectorizer.num_features_} features")
    
    print(f"Transforming {len(val_texts)} validation records...")
    X_val = vectorizer.transform(val_texts)
    
    hp = config.get("hyperparameters", {})
    clf = LinearSVMClassifier(
        C=hp.get("C", 1.0),
        max_iter=hp.get("max_iter", 30),
        class_weight=hp.get("class_weight", "balanced"),
        random_state=config.get("random_state", 42)
    )
    
    target_classes = config.get("target_classes", sorted(list(set(train_labels))))
    clf.fit(X_train, train_labels, vectorizer.num_features_, target_classes)
    train_duration = time.time() - start_time
    print(f"Training completed in {train_duration:.2f}s")
    
    inf_start = time.time()
    val_predictions = clf.predict(X_val)
    val_duration = time.time() - inf_start
    
    evaluator = ClassificationEvaluator(target_classes)
    val_metrics = evaluator.compute_metrics(val_labels, val_predictions)
    val_metrics["training_time_sec"] = round(train_duration, 4)
    val_metrics["inference_time_sec"] = round(val_duration, 4)
    val_metrics["avg_inference_latency_ms"] = round((val_duration / len(val_texts)) * 1000, 3)
    val_metrics["vocab_size"] = vectorizer.num_features_
    
    print(f"Validation Macro F1: {val_metrics['macro_f1']:.4f} | Weighted F1: {val_metrics['weighted_f1']:.4f} | Accuracy: {val_metrics['accuracy']:.4f}")
    
    return {
        "model": clf,
        "vectorizer": vectorizer,
        "val_metrics": val_metrics,
        "config": config
    }
