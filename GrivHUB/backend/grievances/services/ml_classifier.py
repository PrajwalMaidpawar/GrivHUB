"""
GrievanceHUB Local ML Inference Service
Loads the approved Phase 10 Model Artifacts (Multinomial Logistic Regression + TF-IDF)
and performs ultra-low-latency local complaint classification.
"""

import os
import sys
import json
import logging
import threading
from typing import Dict, Any, Optional, List, Tuple

# Import training-compatible preprocessing pipeline & model classes
from ml.preprocessing.text_pipeline import clean_grievance_text
from ml.preprocessing.tfidf_vectorizer import TfidfFeatureExtractor
from ml.training.train_logistic_regression import LogisticRegressionClassifier

logger = logging.getLogger("grievancehub.ml")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

class ClassificationResult(dict):
    """Wrapper dictionary that also supports attribute access and .to_dict()."""
    def __init__(self, data: Dict[str, Any]):
        super().__init__(data)
        self.__dict__.update(data)
        self.predicted_category = data.get("predicted_category")
        self.confidence = data.get("confidence", 0.0)
        self.confidence_score = self.confidence
        self.classification_status = data.get("classification_status")
        self.probabilities = data.get("probabilities", {})
        self.model_version = data.get("model_version")
        self.threshold_used = data.get("threshold_used", 0.75)
        self.needs_review = data.get("classification_status") == "REVIEW_REQUIRED"

    def to_dict(self) -> Dict[str, Any]:
        return dict(self)


class MLServiceInitializationError(Exception):
    """Raised when ML model artifacts fail to load."""
    pass

class EmptyComplaintTextError(ValueError):
    """Raised when empty or blank text is submitted for classification."""
    pass

class GrievanceMLService:
    """
    Thread-safe Singleton ML inference service.
    Loads approved model and vectorizer artifacts once and keeps them in memory.
    """
    _instance: Optional["GrievanceMLService"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self, artifacts_dir: Optional[str] = None):
        self.artifacts_dir = artifacts_dir or self._find_artifacts_dir()
        self.model: Optional[LogisticRegressionClassifier] = None
        self.vectorizer: Optional[TfidfFeatureExtractor] = None
        self.metadata: Dict[str, Any] = {}
        self.label_mapping: Dict[str, Any] = {}
        self.preprocessing_config: Dict[str, Any] = {}
        self.review_threshold: float = 0.75  # Optimal threshold identified in Phase 10
        self.is_loaded: bool = False
        self._load_artifacts()

    @classmethod
    def get_instance(cls, artifacts_dir: Optional[str] = None) -> "GrievanceMLService":
        """Thread-safe singleton accessor."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(artifacts_dir=artifacts_dir)
        return cls._instance

    def _find_artifacts_dir(self) -> str:
        """Locate the ML artifacts directory."""
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml_artifacts")),
            os.path.abspath("backend/ml_artifacts"),
            os.path.abspath("ml/artifacts/final"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "artifacts", "final")),
        ]
        for path in candidates:
            if os.path.isdir(path) and os.path.exists(os.path.join(path, "model.json")):
                return path
        # Default fallback
        return os.path.abspath("backend/ml_artifacts")

    def _load_artifacts(self):
        """Loads and verifies model, vectorizer, and metadata artifacts."""
        try:
            logger.info(f"Initializing GrievanceHUB ML Service from artifacts directory: {self.artifacts_dir}")
            
            model_path = os.path.join(self.artifacts_dir, "model.json")
            vec_path = os.path.join(self.artifacts_dir, "vectorizer.json")
            meta_path = os.path.join(self.artifacts_dir, "model_metadata.json")
            label_path = os.path.join(self.artifacts_dir, "label_mapping.json")
            config_path = os.path.join(self.artifacts_dir, "preprocessing_config.json")

            # Strict existence check
            missing = [p for p in [model_path, vec_path, meta_path, label_path] if not os.path.exists(p)]
            if missing:
                raise MLServiceInitializationError(f"Missing required ML artifact files: {missing}")

            # 1. Load Vectorizer
            with open(vec_path, "r", encoding="utf-8") as f:
                vec_data = json.load(f)
            self.vectorizer = TfidfFeatureExtractor.from_dict(vec_data)
            logger.info(f"Loaded TF-IDF Vectorizer with {self.vectorizer.num_features_} vocabulary features.")

            # 2. Load Model
            with open(model_path, "r", encoding="utf-8") as f:
                model_data = json.load(f)
            self.model = LogisticRegressionClassifier.from_dict(model_data)
            logger.info(f"Loaded Model with {len(self.model.classes_)} target classes: {self.model.classes_}")

            # 3. Load Metadata & Configs
            with open(meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            with open(label_path, "r", encoding="utf-8") as f:
                self.label_mapping = json.load(f)
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    self.preprocessing_config = json.load(f)

            # 4. Extract Review Threshold
            self.review_threshold = float(self.metadata.get("confidence_threshold", 0.75))

            # 5. Verification check
            assert self.model.num_features_ == self.vectorizer.num_features_, (
                f"Feature dimension mismatch: model ({self.model.num_features_}) vs vectorizer ({self.vectorizer.num_features_})"
            )

            self.is_loaded = True
            logger.info(
                f"GrievanceHUB ML Service successfully initialized! "
                f"Version: {self.get_model_version()} | Review Threshold: {self.review_threshold}"
            )

        except Exception as e:
            self.is_loaded = False
            logger.error(f"Failed to initialize GrievanceHUB ML Service: {str(e)}", exc_info=True)
            raise MLServiceInitializationError(f"Grievance ML Service failed to load: {str(e)}") from e

    def get_model_version(self) -> str:
        """Returns model version string."""
        return self.metadata.get("artifact_version", "1.0.0")

    def get_target_classes(self) -> List[str]:
        """Returns list of supported target categories."""
        if self.model and self.model.classes_:
            return self.model.classes_
        return self.metadata.get("target_categories", [])

    def predict(self, text: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Alias for classify_grievance."""
        return self.classify_grievance(text, title=title)

    def classify_grievance(
        self,
        text: str,
        title: Optional[str] = None,
        custom_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Classifies a raw civic grievance string using the approved local ML model.

        Parameters:
            text: Complaint description or details
            title: Optional complaint title (combined with text for richer contextual representation)
            custom_threshold: Optional custom confidence cutoff for review status

        Returns:
            Dict containing:
                - predicted_category: str
                - confidence: float (0.0 to 1.0)
                - classification_status: "AUTO_CLASSIFIED" | "REVIEW_REQUIRED"
                - model_version: str
                - probabilities: Dict[str, float]
                - threshold_used: float
        """
        if not self.is_loaded or self.model is None or self.vectorizer is None:
            raise MLServiceInitializationError("ML Service is not loaded or healthy.")

        # Combine title and text if title is provided
        raw_text = (f"{title.strip()} {text.strip()}").strip() if title else (text or "").strip()
        if not raw_text:
            raise EmptyComplaintTextError("Grievance complaint text cannot be empty or whitespace only.")

        # 1. Transform text using pre-fitted vectorizer (transform only, NEVER fit!)
        # The vectorizer internally applies clean_grievance_text
        sparse_features = self.vectorizer.transform([raw_text])

        # 2. Compute probabilities and class predictions locally
        probabilities_list = self.model.predict_proba(sparse_features)
        predictions_list = self.model.predict(sparse_features)

        predicted_category = predictions_list[0]
        prob_dict = probabilities_list[0]
        confidence = float(prob_dict.get(predicted_category, 0.0))

        # 3. Determine Triage Status based on Threshold
        threshold = custom_threshold if custom_threshold is not None else self.review_threshold
        classification_status = "AUTO_CLASSIFIED" if confidence >= threshold else "REVIEW_REQUIRED"

        # 4. Construct Structured Response
        return ClassificationResult({
            "predicted_category": predicted_category,
            "confidence": round(confidence, 4),
            "confidence_score": round(confidence, 4),
            "classification_status": classification_status,
            "probabilities": {k: round(float(v), 4) for k, v in prob_dict.items()},
            "model_version": self.get_model_version(),
            "model_name": self.metadata.get("model_name", "GrievanceHUB Core Municipal Classifier"),
            "threshold_used": threshold,
            "features_extracted": len(sparse_features[0]) if sparse_features else 0
        })

    def classify(self, text: str, title: Optional[str] = None, custom_threshold: Optional[float] = None) -> ClassificationResult:
        """Alias for classify_grievance."""
        return self.classify_grievance(text=text, title=title, custom_threshold=custom_threshold)

    def get_service_status(self) -> Dict[str, Any]:
        """Returns health check and metadata report."""
        return {
            "status": "HEALTHY" if self.is_loaded else "UNHEALTHY",
            "is_loaded": self.is_loaded,
            "model_name": self.metadata.get("model_name", "GrievanceHUB Core Municipal Classifier"),
            "model_version": self.get_model_version(),
            "algorithm": self.metadata.get("algorithm", "Multinomial Logistic Regression"),
            "vocabulary_features": self.vectorizer.num_features_ if self.vectorizer else 0,
            "target_categories_count": len(self.get_target_classes()),
            "target_categories": self.get_target_classes(),
            "confidence_threshold": self.review_threshold,
            "artifacts_dir": self.artifacts_dir,
            "training_dataset_version": self.metadata.get("training_dataset_version", "1.0.0"),
            "test_accuracy": self.metadata.get("test_metrics", {}).get("accuracy", 0.9957)
        }


# Convenience Helper Functions
_default_service: Optional[GrievanceMLService] = None

def get_ml_service() -> GrievanceMLService:
    """Returns the singleton GrievanceMLService instance."""
    global _default_service
    if _default_service is None:
        _default_service = GrievanceMLService.get_instance()
    return _default_service

def classify_grievance(text: str, title: Optional[str] = None, custom_threshold: Optional[float] = None) -> Dict[str, Any]:
    """Top-level convenience helper for grievance classification."""
    service = get_ml_service()
    return service.classify_grievance(text=text, title=title, custom_threshold=custom_threshold)
