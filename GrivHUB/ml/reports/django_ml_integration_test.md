# GrievanceHUB Phase 11: Django ML Integration & Performance Test Report

**Test Execution Date:** 2026-08-21 19:31:18 UTC  
**Model Architecture:** Multinomial Logistic Regression ($C=1.0$, L2 Balanced) + TF-IDF Vectorizer (8,270 features)  
**Environment:** Local Python / Django Runtime with In-Memory ML Singleton & MongoDB Storage Layer  

---

## 1. Executive Performance Summary

| Performance Metric | Measured Result | Production Gate SLA | Status |
| :--- | :--- | :--- | :--- |
| **Model Startup Loading Time** | **42.39 ms** | $< 500.0$ ms | **PASS** |
| **Mean Inference Latency** | **0.117 ms / request** | $< 5.0$ ms | **PASS** |
| **Median (P50) Latency** | **0.080 ms / request** | $< 2.0$ ms | **PASS** |
| **95th Percentile (P95) Latency** | **0.095 ms / request** | $< 5.0$ ms | **PASS** |
| **99th Percentile (P99) Latency** | **0.103 ms / request** | $< 10.0$ ms | **PASS** |
| **Local Inference Throughput** | **8560.5 req / sec** | $> 100$ req / sec | **PASS** |
| **End-to-End API Submission Latency** | **2.465 ms** | $< 50.0$ ms | **PASS** |
| **Memory Footprint** | **~2.0 MB** | $< 50.0$ MB | **PASS** |

---

## 2. In-Memory ML Service Latency Distribution (1,000 Sequential Queries)

- **Minimum Latency:** `0.052 ms`
- **Median Latency:** `0.080 ms`
- **Mean Latency:** `0.117 ms`
- **P95 Latency:** `0.095 ms`
- **P99 Latency:** `0.103 ms`
- **Maximum Latency:** `37.946 ms`

---

## 3. Text Length Scalability Testing

| Test Payload Scale | Length (Chars) | Word Count | Latency (ms) | Predicted Category | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Short Complaint** | 7 | 1 | **0.061 ms** | `Roads and Infrastructure` | 89.4% | `AUTO_CLASSIFIED` |
| **Medium Complaint** | 89 | 15 | **0.111 ms** | `Parks and Environment` | 39.1% | `REVIEW_REQUIRED` |
| **Long Complaint** | 2850 | ~400 | **0.935 ms** | `Roads and Infrastructure` | 30.9% | `REVIEW_REQUIRED` |
| **Ultra-Long Complaint** | 16800 | ~2,000 | **4.694 ms** | `Roads and Infrastructure` | 42.8% | `REVIEW_REQUIRED` |

---

## 4. Indian Multilingual / Transliteration Text Testing

| Indian Query Text | Expected Domain | Predicted Category | Confidence | Review Status | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *"Nala block aagide sewage water rasthe mele barthide (Kannada-English)"* | `Drainage and Sewage` | **`Water Supply`** | **38.6%** | `REVIEW_REQUIRED` | 0.08 ms |
| *"Sadak pe bada khaddha hai pothole accident ho sakta hai (Hindi-English)"* | `Roads and Infrastructure` | **`Roads and Infrastructure`** | **51.1%** | `REVIEW_REQUIRED` | 0.07 ms |
| *"Kachra dumper nahi aaya kooda daan overflow ho gaya (Hindi-English)"* | `Sanitation and Waste Management` | **`Drainage and Sewage`** | **63.3%** | `REVIEW_REQUIRED` | 0.06 ms |
| *"Pani ka pipeline phoot gaya drinking water supply stopped (Hindi-English)"* | `Water Supply` | **`Water Supply`** | **84.3%** | `AUTO_CLASSIFIED` | 0.06 ms |
| *"BESCOM light bulb off aagide street pole dark (Kannada-English)"* | `Street Lighting and Electrical Infrastructure` | **`Street Lighting and Electrical Infrastructure`** | **77.3%** | `AUTO_CLASSIFIED` | 0.07 ms |

---

## 5. Robustness & Error Handling Audit

- **Empty / Whitespace Input:** Safely caught by `EmptyComplaintTextError` and returns `400 Bad Request` with structured error message.
- **Missing Artifacts:** Safely trapped by `MLServiceInitializationError` returning clean `503 Service Unavailable` without leaking internal traces.
- **Malformed Serializer Data:** Caught by `ValidationError` returning HTTP `400` with field-level guidance.
- **Officer Feedback Integration:** Every manual correction updates both the grievance document and appends an immutable feedback record into `ml/datasets/feedback/officer_corrections.json` for future retraining audits.
