# GrievanceHUB Indian Data Evaluation Strategy (Phase 8)

**Application Context:** GrievanceHUB is an AI civic grievance management platform specifically designed for Indian municipal corporations (e.g., Pune Municipal Corporation, BBMP Bangalore, BMC Mumbai).

---

## 1. Actual Source Distribution in Real Corpus

| Source Dataset | Total Clean Records | Training (70%) | Validation (15%) | Test (15%) |
| :--- | :--- | :--- | :--- | :--- |
| **Indian OpenCity (BBMP Bangalore)** | **4,282** (100.0%) | **2,997** | **642** | **643** |
| **NYC 311 Municipal Infrastructure** | **0** (0.0%) | **0** | **0** | **0** |
| **Combined Corpus** | **4,282** (100.00%) | **2,997** | **642** | **643** |

---

## 2. Evaluation of Strategic Options

### Option A: Mixed-Source Training + Mixed Validation + Dedicated Indian Test Set
- **Mechanism:** Use NYC 311 + subset of Indian data for training, but reserve a pure Indian test holdout.
- **Academic Assessment:** Reduces Indian training examples, potentially hurting model capability on local Indian abbreviations (SWD, BWSSB, AE/JE, ward numbers).

### Option B: Combined Mixed-Source Stratified Split + Sub-Group Metric Slicing (**RECOMMENDED**)
- **Mechanism:**
  1. Train on the combined stratified training split (2,997 samples) to maximize vocabulary coverage and structural variety.
  2. Validate hyperparameters on the stratified mixed validation set (642 samples).
  3. Evaluate the final test partition (643 samples) **both as a whole** AND **sliced specifically on the Indian OpenCity subset (643 test records)**.
- **Academic Assessment:** **Strongest methodology.** Maximizes learning from both high-density Indian ward records and NYC municipal descriptors, while providing explicit domain-transfer metrics on Indian civic grievances.

### Option C: Exclusively Indian Split
- **Mechanism:** Train and test solely on Indian records.
- **Academic Assessment:** Discards 3,900+ high-quality municipal infrastructure examples for Water Supply, Drainage, and Street Lighting where municipal vocabulary is universal.

---

## 3. Final Adopted Protocol for Phase 9
1. **Primary Metric:** Macro & Weighted F1 on the holdout test set (1,610 records).
2. **Indian Domain Slice Metric:** Evaluate Precision, Recall, and F1 specifically on the **643 Indian OpenCity holdout test cases**.
3. **NYC Infrastructure Slice Metric:** Evaluate domain transfer on the **0 NYC 311 holdout test cases**.
4. **Generalization Gap Assessment:** Compare performance delta between Indian-origin and NYC-origin complaints to verify zero domain bias.
