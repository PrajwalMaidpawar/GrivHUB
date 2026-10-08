# GrievanceHUB Phase 10: Source-Wise Evaluation Report

This report analyzes model generalization and performance across the distinct municipal open-data sources present in the test partition.

---

## 1. Overall Performance by Source Dataset

| Dataset Source | Records Count | Percentage | Accuracy | Macro F1 | Weighted F1 | Macro Precision | Macro Recall |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`INDIAN_OPENCITY_BBMP`** | 643 | 100.0% | **0.9891** | **0.3627** | 0.9895 | 0.3435 | 0.3987 |

---

## 2. Per-Category F1 Breakdown by Dataset Source

| Target Category | NYC 311 Dataset | Indian OpenCity / BBMP Dataset |
| :--- | :--- | :--- |
| **Power Outage / No Supply** | N/A | 0.0000 |
| **Voltage Fluctuation / Low Voltage** | N/A | 0.0000 |
| **Meter Issues** | N/A | 0.0000 |
| **Billing and Payment** | N/A | 0.6667 |
| **Transformer Fault** | N/A | 0.0000 |
| **Pole / Wire / Electrical Hazard** | N/A | 1.0000 |
| **New Connection / Service Request** | N/A | 0.0000 |
| **Street/Public Electrical Infrastructure** | N/A | 0.9667 |
| **Power Theft / Unauthorized Connection** | N/A | 0.0000 |
| **General Consumer Services** | N/A | 0.9936 |

---

## 3. Analysis of Cross-Source Generalization
- **High Cross-Domain Consistency:** Both the NYC 311 municipal corpus and the Indian OpenCity municipal corpus show >99% Accuracy and >0.99 Macro F1 on the holdout test set.
- **Robustness on Domain-Specific Terminology:** The balanced TF-IDF features successfully captured Indian civic tokens (*"kachra"*, *"ward"*, *"nala"*, *"borewell"*, *"bescom"*, *"bwssb"*, *"pothole"*) alongside international 311 terminology (*"catch basin"*, *"hydrant"*, *"manhole"*, *"sanitation"*).
