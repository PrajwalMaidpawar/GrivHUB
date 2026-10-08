# Dataset Inspection Report: GrievanceHUB Real-World Datasets

**Execution Date:** 2026-08-21  
**Inspection Script:** `ml/preprocessing/inspect_dataset.py`  
**Datasets Analyzed:** 
1. NYC 311 Service Requests (2020 to Present - Filtered Municipal Infrastructure Subset)
2. Indian OpenCity Municipal Grievance Redressal Dataset (BBMP Sahaaya Bangalore)

---

## 1. NYC 311 Dataset Inspection

### Overview & File Profile
- **Dataset Name:** NYC 311 Service Requests from 2010 to Present (Targeted Municipal Agencies: DEP, DSNY, DOT, DPR)
- **Source Organization:** City of New York / NYC OpenData (DoITT / OTI)
- **File Format:** JSON (Batch-chunked)
- **Files Inspected:** 5 files (`nyc311_offset_0_2000.json` to `nyc311_offset_8000_2000.json`)
- **Total Downloaded Size:** 6.00 MB (6,290,094 bytes)
- **Total Records Downloaded:** **10,000 records**
- **Columns Detected (16 columns):**
  `unique_key`, `created_date`, `agency`, `agency_name`, `complaint_type`, `descriptor`, `location_type`, `incident_zip`, `incident_address`, `street_name`, `city`, `borough`, `status`, `resolution_description`, `latitude`, `longitude`

### Column Field Types & Missing Data Summary
| Column Name | Data Type | Populated Count | Missing / Null Count | Missing % |
| :--- | :--- | :--- | :--- | :--- |
| `unique_key` | `str` | 10,000 | 0 | 0.00% |
| `created_date` | `str` (ISO Timestamp) | 10,000 | 0 | 0.00% |
| `agency` | `str` (DEP, DSNY, DOT, DPR) | 10,000 | 0 | 0.00% |
| `agency_name` | `str` | 10,000 | 0 | 0.00% |
| `complaint_type` | `str` | 10,000 | 0 | 0.00% |
| `descriptor` | `str` | 9,997 | 3 | 0.03% |
| `status` | `str` | 10,000 | 0 | 0.00% |
| `resolution_description`| `str` | 9,788 | 212 | 2.12% |
| `borough` | `str` | 10,000 | 0 | 0.00% |
| `incident_address` | `str` | 8,970 | 1,030 | 10.30% |
| `latitude` | `str` / `float` | 9,335 | 665 | 6.65% |
| `longitude` | `str` / `float` | 9,335 | 665 | 6.65% |

### Candidate Fields for Pipeline
- **Complaint Problem Text:** `complaint_type` + `descriptor` + `resolution_description`
- **Category Label:** `complaint_type` (64 unique types identified)
- **Agency / Department:** `agency` (DEP: Water/Sewage, DSNY: Sanitation, DOT: Roads/Traffic/Lights, DPR: Parks/Trees)
- **Location:** `borough`, `incident_zip`, `incident_address`, `latitude`, `longitude`
- **Date & Status:** `created_date`, `status`

### Real Sample Record (Anonymized)
```json
{
  "unique_key": "70115201",
  "created_date": "2026-08-20T01:50:46.000",
  "agency": "DEP",
  "agency_name": "Department of Environmental Protection",
  "complaint_type": "Water Maintenance",
  "descriptor": "Fire Hydrant Running Full",
  "borough": "BRONX",
  "incident_address": "1963 WATSON AVENUE",
  "status": "In Progress",
  "latitude": "40.82876638164466",
  "longitude": "-73.85805712987411"
}
```

---

## 2. Indian OpenCity Dataset Inspection

### Overview & File Profile
- **Dataset Name:** Bruhat Bengaluru Mahanagara Palike (BBMP Sahaaya) Civic Grievance Redressal Dataset
- **Source Organization:** OpenCity.in / CivicDataLab / BBMP Urban Local Body
- **File Format:** JSON (Batch-chunked)
- **Files Inspected:** 5 files (`batch_offset_0_2000.json` to `batch_offset_8000_2000.json`)
- **Total Downloaded Size:** 3.42 MB (3,588,688 bytes)
- **Total Records Downloaded:** **10,000 records** (Total in resource universe: 126,974 records)
- **Columns Detected (9 columns):**
  `_id`, `Complaint ID`, `Category`, `Sub Category`, `Grievance Date`, `Ward Name`, `Grievance Status`, `Staff Remarks`, `Staff Name`

### Column Field Types & Missing Data Summary
| Column Name | Data Type | Populated Count | Missing / Null Count | Missing % |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `int` | 10,000 | 0 | 0.00% |
| `Complaint ID` | `str` (e.g., "20771690") | 10,000 | 0 | 0.00% |
| `Category` | `str` | 10,000 | 0 | 0.00% |
| `Sub Category` | `str` | 10,000 | 0 | 0.00% |
| `Grievance Date` | `str` (Timestamp) | 10,000 | 0 | 0.00% |
| `Ward Name` | `str` | 10,000 | 0 | 0.00% |
| `Grievance Status` | `str` | 10,000 | 0 | 0.00% |
| `Staff Remarks` | `str` | 9,997 | 3 (or `\N`) | 0.03% |
| `Staff Name` | `str` | 10,000 | 0 | 0.00% |

### Candidate Fields for Pipeline
- **Complaint Problem Text:** `Sub Category` (specific issue, e.g. "Street Light Not Working", "Garbage dump", "Potholes") combined with `Category` and `Staff Remarks`
- **Category Label:** `Category` (29 unique high-level departments) and `Sub Category` (131 unique issue types)
- **Agency / Department:** Derived from `Category` and `Staff Name` (`/JE`, `/AE`, `/ARO`, `/Marshal`)
- **Location:** `Ward Name` (198 official municipal administrative wards)
- **Date & Status:** `Grievance Date`, `Grievance Status`

### Real Sample Record (Anonymized)
```json
{
  "_id": 1,
  "Complaint ID": "20771690",
  "Category": "Electrical",
  "Sub Category": "Street Light Not Working",
  "Grievance Date": "2025-06-19 10:39:00.000000000",
  "Ward Name": "Jagajeevanram Nagar",
  "Grievance Status": "Registered",
  "Staff Remarks": "1st Assignment Based on Ward Mapping",
  "Staff Name": "syed zameer/JE"
}
```
