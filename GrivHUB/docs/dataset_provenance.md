# GrievanceHUB Dataset Provenance & Real-Data Authenticity Document

## 1. Executive Summary & Provenance Statement
This document establishes the origin, chain of custody, raw file verification, PII sanitization, deduplication, and domain scope for the machine-learning training dataset used in **GrievanceHUB**.

> **TECHNICAL & ACADEMIC HONESTY DECLARATION:**  
> The machine-learning model in GrievanceHUB is trained strictly on **real-world Indian public grievance data** (OpenCity BBMP Electrical Sub-Domain).  
> The dataset is **NOT** sourced directly from internal MSEB/MSEDCL corporate databases (as those are non-public proprietary systems). It is accurately described as **"Real-world Indian electricity-domain grievance data."**  
> **Zero synthetic data** (0 generated, 0 Faker, 0 LLM/GPT complaints) was used for ML model training, validation, or testing.

---

## 2. Dataset Metadata Manifest

| Attribute | Details |
| :--- | :--- |
| **Dataset Name** | Indian OpenCity BBMP Sahaaya Public Grievance Database (Electrical Sub-Domain) |
| **Source Organization** | OpenCity.in / CivicDataLab (Indian Public Civic Data Portal) |
| **Official URL** | [https://data.opencity.in](https://data.opencity.in) |
| **API Resource Endpoint** | `https://data.opencity.in/api/action/datastore_search?resource_id=1342a93b-9a61-4766-9c34-c8357b7926c2` |
| **License / Usage** | Open Data Commons Open Database License (ODbL) / Public Government Data |
| **Access Date** | August 2026 / September 2026 |
| **Raw Harvested Records** | **10,000 records** (5 batch files) |
| **Total Raw File Size** | **3,692,038 bytes (~3.69 MB)** |
| **Language Distribution** | 100% English & Transliterated Indian English (*"street light dark"*, *"wire loose"*, *"feeder trip"*) |
| **Geographic Context** | Urban India (BBMP Municipal Ward Offices, Bengaluru, Karnataka) |

---

## 3. Raw Batch Files SHA-256 Hashes

| File Path | File Size | SHA-256 Checksum |
| :--- | :--- | :--- |
| `ml/datasets/raw/indian_opencity/batch_offset_0_2000.json` | 755,065 B | `f200ad9d97b12e9d75eb0918b3011267ae49405c60d90aa7d36d4ae66ee5fc67` |
| `ml/datasets/raw/indian_opencity/batch_offset_2000_2000.json` | 742,555 B | `8a308870c9f3333b12ee98ef8a13f366e10a2ed1af336f93ad56fcfc1c4cab5c` |
| `ml/datasets/raw/indian_opencity/batch_offset_4000_2000.json` | 735,285 B | `52145d94b5a3773ab40b6fe2abcf88b97e018a7d115b8004399258a204cfbbf2` |
| `ml/datasets/raw/indian_opencity/batch_offset_6000_2000.json` | 731,641 B | `0648136d3df1f375e4cce66366507f4cd52bc3b9fa4024b2882139ed53167758` |
| `ml/datasets/raw/indian_opencity/batch_offset_8000_2000.json` | 727,492 B | `f7b770c449a4da869555af6926471995b3382db30ff614c1d5db6e40fc3d994b` |

---

## 4. Processed Training Dataset Manifest

| Attribute | Value |
| :--- | :--- |
| **Processed File Path** | `ml/datasets/processed/grievancehub_training_dataset.json` |
| **Processed File Size** | **3,050,315 bytes (~3.05 MB)** |
| **Processed SHA-256 Checksum** | `290b46e4101078dbaa57daf0a0606227b16d18027d88555591cfacf7f0bc9671` |
| **Raw Input Records** | 10,000 |
| **Valid Scrubbed Records** | 10,000 |
| **Exact Duplicate Records Removed** | 5,718 |
| **Unique Records Retained** | **4,282** |
| **Training Partition (70%)** | 2,997 records |
| **Validation Partition (15%)** | 642 records |
| **Untouched Test Partition (15%)** | 643 records |

---

## 5. Domain Relevance & Electricity Focus
The dataset is composed of genuine public grievance complaints filed with municipal electrical ward offices, covering:
1. **Street Lighting & Electrical Utility Maintenance** (*"Street light not working in Jagajeevanram Nagar - 1st Assignment based on ward mapping"*).
2. **Electrical Infrastructure Defects** (*"Open Electrical Junction Box"*, *"Earthing issue related to Electric Poles/Panel Boards"*).
3. **General Consumer Electrical Inquiries** (*"Field inspection assigned to JE/AE officer"*).

* **NYC 311 Exclusion:** 10,000 raw NYC 311 municipal records were evaluated during initial research but **completely excluded** from the final production ML dataset to preserve pure Indian domain relevance.
* **Synthetic Data Exclusion:** **0 generated records** (0 Faker, 0 LLM). Demo test fixtures are stored separately in `src/data/initialData.js` and never enter the `ml/` training directory.
