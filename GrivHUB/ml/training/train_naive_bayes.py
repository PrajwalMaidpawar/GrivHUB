"""
GrievanceHUB Model 1: Multinomial Naive Bayes Classifier
Exact, high-performance sparse implementation of Multinomial Naive Bayes for text classification.
"""

import math
import os
import json
import time
from collections import defaultdict, Counter
from typing import List, Dict, Any, Tuple
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.evaluation.evaluate_model import ClassificationEvaluator

class MultinomialNBClassifier:
    def __init__(self, alpha: float = 0.1, fit_prior: bool = True):
        self.alpha = alpha
        self.fit_prior = fit_prior
        
        self.classes_: List[str] = []
        self.class_to_idx_: Dict[str, int] = {}
        self.class_log_prior_: List[float] = []
        self.feature_log_prob_: List[Dict[int, float]] = []  # class_idx -> {feat_idx: log_prob}
        self.default_feature_log_prob_: List[float] = []      # class_idx -> log_prob for unseen features
        self.num_features_: int = 0

    def fit(self, X_sparse: List[Dict[int, float]], y: List[str], num_features: int, classes: List[str]):
        """
        Fits Multinomial Naive Bayes on sparse TF-IDF vectors.
        """
        self.classes_ = sorted(classes)
        self.class_to_idx_ = {c: i for i, c in enumerate(self.classes_)}
        self.num_features_ = num_features
        num_classes = len(self.classes_)
        n_samples = len(y)

        # Count samples per class
        class_counts = Counter(y)
        if self.fit_prior:
            self.class_log_prior_ = [
                math.log(max(1, class_counts[c]) / n_samples) for c in self.classes_
            ]
        else:
            self.class_log_prior_ = [math.log(1.0 / num_classes) for _ in self.classes_]

        # Accumulate feature weights per class
        # class_feature_sums[class_idx][feature_idx] = sum of tfidf values
        class_feature_sums = [defaultdict(float) for _ in range(num_classes)]
        class_total_weights = [0.0 for _ in range(num_classes)]

        for doc_vec, label in zip(X_sparse, y):
            c_idx = self.class_to_idx_[label]
            for feat_idx, val in doc_vec.items():
                class_feature_sums[c_idx][feat_idx] += val
                class_total_weights[c_idx] += val

        # Compute log P(w|c) with Laplace/Lidstone smoothing
        self.feature_log_prob_ = [{} for _ in range(num_classes)]
        self.default_feature_log_prob_ = [0.0 for _ in range(num_classes)]

        for c_idx in range(num_classes):
            # Denominator: total weight in class + alpha * num_features
            denom = class_total_weights[c_idx] + self.alpha * num_features
            log_denom = math.log(denom) if denom > 0 else 0.0

            # Default log prob for zero-count features
            self.default_feature_log_prob_[c_idx] = math.log(self.alpha) - log_denom

            # Specific log prob for seen features
            for feat_idx, weight in class_feature_sums[c_idx].items():
                prob = (weight + self.alpha) / denom
                self.feature_log_prob_[c_idx][feat_idx] = math.log(prob)

        return self

    def predict_log_proba(self, X_sparse: List[Dict[int, float]]) -> List[List[float]]:
        num_classes = len(self.classes_)
        all_log_probas = []

        for doc_vec in X_sparse:
            log_scores = list(self.class_log_prior_)
            for c_idx in range(num_classes):
                feat_probs = self.feature_log_prob_[c_idx]
                default_lp = self.default_feature_log_prob_[c_idx]
                for feat_idx, val in doc_vec.items():
                    lp = feat_probs.get(feat_idx, default_lp)
                    log_scores[c_idx] += val * lp
            all_log_probas.append(log_scores)

        return all_log_probas

    def predict_proba(self, X_sparse: List[Dict[int, float]]) -> List[Dict[str, float]]:
        log_probas = self.predict_log_proba(X_sparse)
        probabilities = []

        for lps in log_probas:
            # Softmax with max subtraction for numerical stability
            max_lp = max(lps)
            exp_scores = [math.exp(lp - max_lp) for lp in lps]
            sum_exp = sum(exp_scores)
            probs = {self.classes_[i]: (exp_scores[i] / sum_exp) for i in range(len(self.classes_))}
            probabilities.append(probs)

        return probabilities

    def predict(self, X_sparse: List[Dict[int, float]]) -> List[str]:
        log_probas = self.predict_log_proba(X_sparse)
        predictions = []
        for lps in log_probas:
            best_idx = max(range(len(lps)), key=lambda i: lps[i])
            predictions.append(self.classes_[best_idx])
        return predictions

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "MultinomialNB",
            "alpha": self.alpha,
            "fit_prior": self.fit_prior,
            "classes": self.classes_,
            "num_features": self.num_features_,
            "class_log_prior": self.class_log_prior_,
            "default_feature_log_prob": self.default_feature_log_prob_,
            "feature_log_prob": [
                {str(k): v for k, v in probs.items()} for probs in self.feature_log_prob_
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MultinomialNBClassifier":
        clf = cls(alpha=data["alpha"], fit_prior=data["fit_prior"])
        clf.classes_ = data["classes"]
        clf.class_to_idx_ = {c: i for i, c in enumerate(clf.classes_)}
        clf.num_features_ = data["num_features"]
        clf.class_log_prior_ = data["class_log_prior"]
        clf.default_feature_log_prob_ = data["default_feature_log_prob"]
        clf.feature_log_prob_ = [
            {int(k): float(v) for k, v in probs.items()} for probs in data["feature_log_prob"]
        ]
        return clf


def train_naive_bayes_model(
    train_records: List[Dict[str, Any]],
    val_records: List[Dict[str, Any]],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes training and validation of Multinomial Naive Bayes model.
    """
    print("\n--- Training Model 1: Multinomial Naive Bayes ---")
    start_time = time.time()
    
    # 1. Feature Extraction on Train only
    fe_cfg = config.get("feature_extraction", {})
    vectorizer = TfidfFeatureExtractor(
        ngram_range=tuple(fe_cfg.get("ngram_range", [1, 2])),
        min_df=fe_cfg.get("min_df", 2),
        max_df=fe_cfg.get("max_df", 0.85),
        max_features=fe_cfg.get("max_features", 10000),
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
    
    # 2. Train Model
    hp = config.get("hyperparameters", {})
    clf = MultinomialNBClassifier(
        alpha=hp.get("alpha", 0.1),
        fit_prior=hp.get("fit_prior", True)
    )
    
    target_classes = config.get("target_classes", sorted(list(set(train_labels))))
    clf.fit(X_train, train_labels, vectorizer.num_features_, target_classes)
    train_duration = time.time() - start_time
    print(f"Training completed in {train_duration:.2f}s")
    
    # 3. Validation Inference
    inf_start = time.time()
    val_predictions = clf.predict(X_val)
    val_duration = time.time() - inf_start
    
    # 4. Evaluation
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
