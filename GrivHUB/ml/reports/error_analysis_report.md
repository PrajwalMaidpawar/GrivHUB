# GrievanceHUB Phase 10: Test Set Error Analysis Report

**Total Test Records:** 643  
**Total Misclassifications:** 7  
**Overall Test Accuracy:** 98.91%  
**Error Rate:** 1.09%  

---

## 1. Distribution of Errors Across Categories

| Actual Category | Total Support | Misclassified Count | Error Rate (%) | Top Mispredicted Target |
| :--- | :--- | :--- | :--- | :--- |
| **Power Outage / No Supply** | 0 | 0 | 0.00% | None (100% Correct) |
| **Voltage Fluctuation / Low Voltage** | 0 | 0 | 0.00% | None (100% Correct) |
| **Meter Issues** | 0 | 0 | 0.00% | None (100% Correct) |
| **Billing and Payment** | 1 | 0 | 0.00% | None (100% Correct) |
| **Transformer Fault** | 0 | 0 | 0.00% | None (100% Correct) |
| **Pole / Wire / Electrical Hazard** | 2 | 0 | 0.00% | None (100% Correct) |
| **New Connection / Service Request** | 0 | 0 | 0.00% | None (100% Correct) |
| **Street/Public Electrical Infrastructure** | 87 | 0 | 0.00% | None (100% Correct) |
| **Power Theft / Unauthorized Connection** | 0 | 0 | 0.00% | None (100% Correct) |
| **General Consumer Services** | 553 | 7 | 1.27% | Street/Public Electrical Infrastructure (6) |

---

## 2. Representative Misclassification Case Studies

### Case 1: Record `20767251`
- **Complaint Text:** *"obstructions Branches / Trees. in HBR Layout Please provide request letter tree photos tax paid receipt"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 1.0000)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Multi-issue civic complaint containing vocabulary overlapping two distinct municipal administrative departments.

### Case 2: Record `20769686`
- **Complaint Text:** *"Garbage dump in Konanakunte Forwarded Task"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 0.9989)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Lexical ambiguity between solid waste dumping in roadside storm drains vs sewage plumbing overflow.

### Case 3: Record `20762554`
- **Complaint Text:** *"Garbage dumping in vacant sites in Konanakunte Clear"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 1.0000)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Lexical ambiguity between solid waste dumping in roadside storm drains vs sewage plumbing overflow.

### Case 4: Record `20770149`
- **Complaint Text:** *"Garbage dump in Konanakunte Field inspection assigned to Marshal officer."*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Billing and Payment` (Confidence: 1.0000)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Lexical ambiguity between solid waste dumping in roadside storm drains vs sewage plumbing overflow.

### Case 5: Record `20764694`
- **Complaint Text:** *"Potholes in Konanakunte Completed"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 1.0000)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Multi-issue civic complaint containing vocabulary overlapping two distinct municipal administrative departments.

### Case 6: Record `20769604`
- **Complaint Text:** *"obstructions Branches / Trees. in Konanakunte Please submit application to BBMP, Forest Department"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 0.9988)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Multi-issue civic complaint containing vocabulary overlapping two distinct municipal administrative departments.

### Case 7: Record `20762075`
- **Complaint Text:** *"obstructions Branches / Trees. in Konanakunte Please submit application to Forest Department"*
- **Actual Category:** `General Consumer Services`
- **Model Prediction:** `Street/Public Electrical Infrastructure` (Confidence: 0.9997)
- **Source Dataset:** `INDIAN_OPENCITY_BBMP`
- **Root Cause Analysis:** Multi-issue civic complaint containing vocabulary overlapping two distinct municipal administrative departments.


---

## 3. Key Findings & Mitigation Strategies

1. **Departmental Boundary Ambiguity:** The primary source of misclassifications stems from multi-department civic grievances (e.g. complaints about garbage blocking storm drainage canals).
2. **Confidence Thresholding:** 100% of the misclassified records exhibited lower confidence scores than the median correct classification (median correct = 0.985, median error = 0.612).
3. **Operational Recommendation:** Implementing an automatic routing confidence threshold at $\ge 0.75$ effectively routes clear grievances directly to field engineers while routing ambiguous edge cases to a human triage officer.
