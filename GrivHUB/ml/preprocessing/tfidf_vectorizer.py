"""
GrievanceHUB TF-IDF Vectorizer
Pure-Python, mathematically rigorous sparse TF-IDF implementation.
Matches scikit-learn TfidfVectorizer (norm='l2', smooth_idf=True, sublinear_tf=True).
"""

import math
from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Optional, Any, Union
from ml.preprocessing.text_pipeline import clean_grievance_text, extract_tokens, MINIMAL_STOPWORDS

class TfidfFeatureExtractor:
    def __init__(
        self,
        ngram_range: Tuple[int, int] = (1, 2),
        min_df: Union[int, float] = 2,
        max_df: Union[int, float] = 0.85,
        max_features: Optional[int] = 10000,
        sublinear_tf: bool = True,
        stop_words: Optional[str] = "english",
        lowercase: bool = True
    ):
        self.ngram_range = ngram_range
        self.min_df = min_df
        self.max_df = max_df
        self.max_features = max_features
        self.sublinear_tf = sublinear_tf
        self.stop_words = stop_words
        self.lowercase = lowercase
        
        # State
        self.vocabulary_: Dict[str, int] = {}
        self.idf_: Dict[int, float] = {}
        self.num_features_: int = 0
        self.n_samples_seen_: int = 0

    def _tokenize(self, text: str) -> List[str]:
        cleaned = clean_grievance_text(text)
        tokens = extract_tokens(cleaned, ngram_range=self.ngram_range, lowercase=self.lowercase)
        if self.stop_words == "english":
            # For unigrams, filter stopwords; for n-grams, keep unless both are stopwords
            filtered = []
            for t in tokens:
                words = t.split()
                if len(words) == 1:
                    if words[0] not in MINIMAL_STOPWORDS:
                        filtered.append(t)
                else:
                    if not all(w in MINIMAL_STOPWORDS for w in words):
                        filtered.append(t)
            return filtered
        return tokens

    def fit(self, raw_documents: List[str]):
        """
        Fits vocabulary and inverse document frequency solely on training corpus.
        """
        self.n_samples_seen_ = len(raw_documents)
        df_counter = Counter()
        tf_total_counter = Counter()
        
        for doc in raw_documents:
            tokens = self._tokenize(doc)
            seen_in_doc = set(tokens)
            for term in seen_in_doc:
                df_counter[term] += 1
            for term in tokens:
                tf_total_counter[term] += 1
                
        # Resolve min_df and max_df thresholds
        min_doc_count = self.min_df if isinstance(self.min_df, int) else int(self.min_df * self.n_samples_seen_)
        max_doc_count = self.max_df if isinstance(self.max_df, int) else int(self.max_df * self.n_samples_seen_)
        
        # Filter terms
        valid_terms = [
            term for term, df in df_counter.items()
            if min_doc_count <= df <= max_doc_count
        ]
        
        # Sort by total frequency, truncate to max_features if needed, then sort alphabetically
        if self.max_features is not None and len(valid_terms) > self.max_features:
            valid_terms.sort(key=lambda t: (-tf_total_counter[t], t))
            valid_terms = valid_terms[:self.max_features]
            
        valid_terms.sort()
        
        self.vocabulary_ = {term: idx for idx, term in enumerate(valid_terms)}
        self.num_features_ = len(self.vocabulary_)
        
        # Compute smooth IDF: log((1 + N) / (1 + df)) + 1.0
        n_samples = self.n_samples_seen_
        self.idf_ = {}
        for term, idx in self.vocabulary_.items():
            df = df_counter[term]
            self.idf_[idx] = math.log((1.0 + n_samples) / (1.0 + df)) + 1.0
            
        return self

    def transform(self, raw_documents: List[str]) -> List[Dict[int, float]]:
        """
        Transforms documents into sparse L2-normalized TF-IDF vectors: List of {feature_idx: tfidf_weight}.
        """
        sparse_matrix = []
        for doc in raw_documents:
            tokens = self._tokenize(doc)
            tf = Counter()
            for t in tokens:
                if t in self.vocabulary_:
                    tf[self.vocabulary_[t]] += 1
                    
            if not tf:
                sparse_matrix.append({})
                continue
                
            # Calculate raw TF-IDF
            doc_vec = {}
            norm_sq = 0.0
            for idx, count in tf.items():
                val = (1.0 + math.log(count)) if self.sublinear_tf else float(count)
                val *= self.idf_[idx]
                doc_vec[idx] = val
                norm_sq += val * val
                
            # L2 Normalize
            if norm_sq > 0:
                l2_norm = math.sqrt(norm_sq)
                for idx in doc_vec:
                    doc_vec[idx] /= l2_norm
                    
            sparse_matrix.append(doc_vec)
            
        return sparse_matrix

    def fit_transform(self, raw_documents: List[str]) -> List[Dict[int, float]]:
        return self.fit(raw_documents).transform(raw_documents)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ngram_range": list(self.ngram_range),
            "min_df": self.min_df,
            "max_df": self.max_df,
            "max_features": self.max_features,
            "sublinear_tf": self.sublinear_tf,
            "stop_words": self.stop_words,
            "lowercase": self.lowercase,
            "vocabulary_": self.vocabulary_,
            "idf_": {str(k): v for k, v in self.idf_.items()},
            "num_features_": self.num_features_,
            "n_samples_seen_": self.n_samples_seen_
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TfidfFeatureExtractor":
        extractor = cls(
            ngram_range=tuple(data["ngram_range"]),
            min_df=data["min_df"],
            max_df=data["max_df"],
            max_features=data["max_features"],
            sublinear_tf=data["sublinear_tf"],
            stop_words=data["stop_words"],
            lowercase=data["lowercase"]
        )
        extractor.vocabulary_ = data["vocabulary_"]
        extractor.idf_ = {int(k): float(v) for k, v in data["idf_"].items()}
        extractor.num_features_ = data["num_features_"]
        extractor.n_samples_seen_ = data["n_samples_seen_"]
        return extractor
