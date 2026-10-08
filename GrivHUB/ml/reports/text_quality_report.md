# Text Quality Analysis Report: GrievanceHUB Datasets

**Execution Date:** 2026-08-21  
**Inspection Script:** `ml/preprocessing/analyze_text_quality.py`  
**Records Analyzed:** 10,000 Indian OpenCity records + 10,000 NYC 311 records

---

## 1. Text Field Length & Completeness Summary

| Text Field | Total Records | Missing / Null (%) | Unique Strings | Avg Length (Chars) | Min Length | Max Length |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Indian OpenCity: `Sub Category`** | 10,000 | 0 (0.00%) | 129 | **22.84** | 5 | 58 |
| **Indian OpenCity: `Staff Remarks`** | 10,000 | 258 (2.58% null/`\N`) | 715 | **38.86** | 1 | 382 |
| **Indian OpenCity: Combined Text** | 10,000 | 0 (0.00%) | 1,516 | **69.80** | 12 | 438 |
| **NYC 311: `descriptor`** | 10,000 | 3 (0.03%) | 313 | **19.86** | 3 | 92 |
| **NYC 311: `complaint_type`** | 10,000 | 0 (0.00%) | 64 | **18.73** | 5 | 32 |
| **NYC 311: `resolution_description`** | 10,000 | 212 (2.12%) | 1,489 | **198.42** | 6 | 823 |
| **NYC 311: Combined Text** | 10,000 | 0 (0.00%) | 3,117 | **233.19** | 12 | 871 |

---

## 2. Text Content & Cleanliness Findings

### A. HTML Tags & Special Characters
- **HTML Injections / Tags:** **0 HTML tags** found in both datasets. The raw text data is plain structured string content.
- **Special Characters:** Present in small percentages:
  - Indian dataset: `/` used extensively in staff designations (e.g., `syed zameer/JE`, `Marshal/Marshal`) and parenthesis in sub-categories (e.g., `Dead animal(s)`).
  - NYC 311 dataset: Slashes and dashes in address/cross streets (e.g., `STREET/SIDEWALK`, `NOISE - RESIDENTIAL`).

### B. Language & Script Breakdown
- **Indian OpenCity Dataset:**
  - Latin/English character presence: **100.0%** of populated text fields are in English / transliterated Indian English.
  - Indic Script (Devanagari / Kannada): **0.0%** native Kannada script (all BBMP Sahaaya records are entered in standardized English or English romanization of local Kannada ward/officer names).
- **NYC 311 Dataset:**
  - Latin/English character presence: **100.0%** in English.

### C. Text Duplication & Repetition Analysis
- In municipal service request systems, problem descriptors are categorized by standard issue types (e.g., `"Street Light Not Working"`, `"Garbage dump"`, `"Potholes"`, `"Catch Basin Clogged/Flooding"`).
- Combining the specific problem string with staff action remarks, resolution descriptions, ward/borough context, and administrative designations creates highly discriminative textual features for machine learning categorization.
