# GrievanceHUB Machine Learning Pipeline Specification

## 1. Objective
Automatically categorize free-text electricity complaints into 10 structured electricity distribution classes using a model trained on real-world Indian electricity and municipal complaint data.

## 2. Target Categories
1. Power Outage / No Supply
2. Voltage Fluctuation / Low Voltage
3. Meter Issues
4. Billing and Payment
5. Transformer Fault
6. Pole / Wire / Electrical Hazard
7. New Connection / Service Request
8. Street/Public Electrical Infrastructure
9. Power Theft / Unauthorized Connection
10. General Consumer Services

## 3. Data Processing & Anonymization
- **PII scrubbing**: Regex-based detection and removal of Indian mobile numbers, email addresses, 12-digit consumer account numbers, and Aadhaar numbers.
- **Normalization**: Lowercasing, HTML noise removal, punctuation stripping, stopword filtering.
- **Deduplication**: Exact and near-duplicate removal to prevent data leakage between train/val/test splits.
- **TF-IDF Feature Extraction**: Unigrams and bigrams, sublinear TF scaling, max features set to vocabulary size.

## 4. Model Training & Evaluation
- Comparison of Multinomial Naive Bayes, Logistic Regression (L2 regularization), and Linear SVM.
- Stratified 70/15/15 Train / Validation / Test split with fixed random seed (42).
- Artifact serialization (`model.joblib`, `vectorizer.joblib`, `model_metadata.json`, `metrics.json`, `confusion_matrix.json`).
