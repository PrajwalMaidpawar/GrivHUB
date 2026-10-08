# Preprocessing & Dataset Creation Report (Phase 7)

**Execution Date:** 2026-09-09 20:34:07  
**Pipeline Orchestrator:** `ml/preprocessing/process_dataset.py`  
**Standardized Schema:** `ml/mappings/schema_mapping.json`  
**Dataset Version:** `1.0.0`

---

## 1. Raw Dataset Summary

- **Source Datasets:**
  1. Indian OpenCity BBMP Sahaaya Grievances (`ml/datasets/raw/indian_opencity/`)
  2. NYC 311 Municipal Infrastructure Requests (`ml/datasets/raw/nyc_311/`)
- **Total Raw Records Ingested:** **20,000**
  - Indian OpenCity: **10,000** records
  - NYC 311: **10,000** records

---

## 2. Validation & Quality Filtering

- **Valid Records Accepted (Pre-Deduplication):** **17,509** (87.55%)
  - Indian OpenCity Accepted: **9,890**
  - NYC 311 Accepted: **7,619**
- **Excluded Records:** **2,491** (12.46%)
  - Indian OpenCity Excluded: **110**
  - NYC 311 Excluded: **2,381**

### Dynamic Exclusion Reasons Breakdown
| Source & Reason | Excluded Record Count |
| :--- | :--- |
| `NYC: EXCLUDED_CATEGORY: Noise` | 517 |
| `NYC: EXCLUDED_CATEGORY: Obstruction` | 331 |
| `NYC: EXCLUDED_CATEGORY: Vendor Enforcement` | 287 |
| `NYC: EXCLUDED_CATEGORY: Lead` | 220 |
| `NYC: EXCLUDED_CATEGORY: Dead/Dying Tree` | 156 |
| `NYC: EXCLUDED_CATEGORY: Residential Disposal Complaint` | 153 |
| `NYC: EXCLUDED_CATEGORY: Air Quality` | 131 |
| `Indian: EXCLUDED_CATEGORY: Others` | 86 |
| `NYC: EXCLUDED_CATEGORY: Illegal Tree Damage` | 75 |
| `NYC: EXCLUDED_CATEGORY: Violation of Park Rules` | 58 |
| `NYC: EXCLUDED_CATEGORY: Litter Basket Request` | 55 |
| `NYC: EXCLUDED_CATEGORY: Illegal Posting` | 48 |
| `NYC: EXCLUDED_CATEGORY: Broken Parking Meter` | 46 |
| `NYC: EXCLUDED_CATEGORY: Abandoned Bike` | 36 |
| `NYC: EXCLUDED_CATEGORY: Sanitation Worker or Vehicle Complaint` | 35 |
| `NYC: EXCLUDED_CATEGORY: Lot Condition` | 33 |
| `NYC: EXCLUDED_CATEGORY: Outdoor Dining` | 30 |
| `NYC: EXCLUDED_CATEGORY: Litter Basket Complaint` | 28 |
| `NYC: EXCLUDED_CATEGORY: Commercial Disposal Complaint` | 26 |
| `NYC: EXCLUDED_CATEGORY: Dumpster Complaint` | 24 |
| `NYC: EXCLUDED_CATEGORY: Hazardous Material` | 22 |
| `NYC: EXCLUDED_CATEGORY: Wood Pile Remaining` | 13 |
| `NYC: EXCLUDED_CATEGORY: Bike Rack` | 11 |
| `NYC: EXCLUDED_CATEGORY: Green Infrastructure` | 11 |
| `NYC: EXCLUDED_CATEGORY: Industrial Waste` | 11 |
| `NYC: EXCLUDED_CATEGORY: Uprooted Stump` | 6 |
| `Indian: EXCLUDED_CATEGORY: Plastic` | 5 |
| `Indian: EXCLUDED_CATEGORY: Information Technology` | 5 |
| `Indian: EXCLUDED_CATEGORY: Markets` | 5 |
| `NYC: EXCLUDED_CATEGORY: E-Scooter` | 4 |
| `NYC: EXCLUDED_CATEGORY: Municipal Parking Facility` | 4 |
| `Indian: EXCLUDED_CATEGORY: Call Center` | 3 |
| `NYC: EXCLUDED_CATEGORY: Bench` | 3 |
| `NYC: EXCLUDED_CATEGORY: Ferry Inquiry` | 3 |
| `Indian: EXCLUDED_CATEGORY: Welfare Schemes` | 2 |
| `Indian: EXCLUDED_CATEGORY: Projects Central` | 2 |
| `NYC: EXCLUDED_CATEGORY: Ferry Complaint` | 2 |
| `Indian: EXCLUDED_CATEGORY: Education` | 1 |
| `Indian: EXCLUDED_CATEGORY: Property Tax services` | 1 |
| `NYC: EXCLUDED_CATEGORY: Recycling Basket Complaint` | 1 |
| `NYC: EXCLUDED_CATEGORY: Incorrect Data` | 1 |

---

## 3. PII Detection & Scrubbing

- **Total PII Entities Detected & Neutralized:** **281**
  - Phone Numbers Masked (`[PHONE]`): **275**
  - Email Addresses Masked (`[EMAIL]`): **6**
  - Aadhaar Numbers Masked (`[AADHAAR]`): **0**
  - Govt IDs / PAN Masked (`[GOVT_ID]`): **0**

---

## 4. Duplicate Detection & Deduplication

- **Initial Valid Records:** **17,509**
- **Exact Text Duplicates Found & Removed:** **6,771**
- **Near-Duplicate Lexical Patterns Flagged:** **1,928**
- **Unique Records Retained in Training Dataset:** **10,738**
- **Deduplication Rate:** **38.67%**

---

## 5. Text Quality & Feature Hygiene

- **Data Leakage Safeguard:** Source category labels and explicit class names were strictly excluded from the composite complaint text.
- **Minimum Text Length Enforced:** `10` characters
- **Cleaned Text Length Statistics (Characters):**
  - Minimum Length: **15**
  - Maximum Length: **972**
  - Average Length: **119.9**

---

## 6. Target Class Distribution (Final Training Dataset)

| Target Category | Record Count | Percentage (%) | Representation Tier |
| :--- | :--- | :--- | :--- |
| **Billing and Payment** | 0 | 0.0% | Low (<300) |
| **General Consumer Services** | 7,663 | 71.36% | Strong (>=1,000) |
| **Meter Issues** | 0 | 0.0% | Low (<300) |
| **New Connection / Service Request** | 0 | 0.0% | Low (<300) |
| **Pole / Wire / Electrical Hazard** | 0 | 0.0% | Low (<300) |
| **Power Outage / No Supply** | 0 | 0.0% | Low (<300) |
| **Power Theft / Unauthorized Connection** | 0 | 0.0% | Low (<300) |
| **Street/Public Electrical Infrastructure** | 3,075 | 28.64% | Strong (>=1,000) |
| **Transformer Fault** | 0 | 0.0% | Low (<300) |
| **Voltage Fluctuation / Low Voltage** | 0 | 0.0% | Low (<300) |
| **TOTAL FINAL DATASET** | **10,738** | **100.00%** | **8 Standard Classes** |

---

## 7. Artifact Locations
- **Processed CSV Dataset:** `ml/datasets/processed/grievancehub_training_dataset.csv`
- **Processed JSON Dataset:** `ml/datasets/processed/grievancehub_training_dataset.json`
- **Interim Standardized JSON:** `ml/datasets/interim/standardized_records.json`
- **Representative Samples:** `ml/datasets/samples/sample_training_records.json`
- **Dataset Metadata:** `ml/datasets/processed/dataset_metadata.json`
