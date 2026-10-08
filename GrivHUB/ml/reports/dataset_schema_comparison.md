# Dataset Schema Comparison: NYC 311 vs. Indian OpenCity

**Inspection Date:** 2026-08-21  
**Verification Method:** Empirical inspection of API schema, field structures, pagination headers, and raw responses.

---

## 1. Schema Matrix

| Field / Attribute | Dataset 1: NYC 311 Service Requests | Dataset 2: Indian OpenCity Municipal Grievances |
| :--- | :--- | :--- |
| **Actual Dataset Name** | NYC 311 Service Requests from 2010 to Present | Bruhat Bengaluru Mahanagara Palike (BBMP Sahaaya) Grievance Redressal Dataset |
| **Source Organization** | NYC Office of Technology and Innovation / NYC OpenData | OpenCity.in / CivicDataLab / BBMP Urban Local Body |
| **City / Jurisdiction** | New York City, USA | Bengaluru (Bangalore), Karnataka, India |
| **Total Record Count** | > 35 Million records | **126,974 records** |
| **Columns Available (Count)** | 35+ columns | **9 columns** |
| **Primary Identifier** | `unique_key` (String, e.g., "70115201") | `Complaint ID` (String, e.g., "20771690") & `_id` (Int) |
| **Problem / Text Field** | `complaint_type` + `descriptor` + `resolution_description` | `Sub Category` (Specific issue text) + `Category` |
| **Category / Domain Field** | `complaint_type` (e.g., "Water Maintenance", "Street Light Condition") | `Category` (e.g., "Electrical", "Solid Waste (Garbage) Related", "Road Maintenance(Engg)") |
| **Agency / Department Field**| `agency` (e.g., "DEP", "DSNY", "DOT", "DPR") & `agency_name` | Derived from `Category` + `Staff Name` (e.g., "JE", "AE", "Marshal", "ARO") |
| **Location Fields** | `incident_address`, `street_name`, `city`, `borough`, `incident_zip`, `latitude`, `longitude` | `Ward Name` (e.g., "Jagajeevanram Nagar", "Banaswadi", "Sarakki", "Nagapura") |
| **Date Fields** | `created_date`, `closed_date`, `resolution_action_updated_date` (ISO format) | `Grievance Date` (Timestamp format: "YYYY-MM-DD HH:MM:SS") |
| **Lifecycle / Status Field** | `status` (e.g., "In Progress", "Closed", "Assigned") | `Grievance Status` (e.g., "Registered", "In Progress", "Closed") |
| **Administrative / Staff Notes**| `resolution_description` | `Staff Remarks` & `Staff Name` |
| **API Pagination Mechanism**| SODA query params: `$limit=N&$offset=N` or `$where=...` | CKAN Datastore params: `limit=N&offset=N` |
| **API Rate Limits** | Standard unauthenticated limit: 1,000 req/hour (App Token gives higher) | Standard open CKAN limits; recommended batch size: 1,000–5,000 |
| **Server-side Filtering** | Fully supported via SoQL (`$where=agency='DEP' AND created_date >= '2024-01-01'`) | Supported via CKAN filters (`filters={"Category": "Electrical"}`) |

---

## 2. Structural Observations

### Indian OpenCity Dataset
- **Strength:** Directly reflects Indian municipal administration, ward nomenclature, engineer/marshal staff assignments, and Indian civic problem terminology.
- **Problem Representation:** The `Sub Category` field functions as the specific grievance classification label (e.g., *"Street Light Not Working"*, *"Garbage dump"*, *"Garbage vehicle not arrived"*, *"Potholes"*, *"Removal of dead/fallen trees"*, *"Sewerage water left in SWD"*, *"footpath encroachment"*).
- **Size & Volume:** 126,974 records is an ideal, manageable size that can be downloaded incrementally and cached locally.

### NYC 311 Dataset
- **Strength:** Highly granular text descriptors across millions of records.
- **Problem Representation:** The combination of `complaint_type` (high-level) and `descriptor` (fine-grained) maps cleanly to municipal utility functions.
- **Filtering Capabilities:** SODA SoQL allows querying only relevant departments (`DEP`, `DSNY`, `DOT`, `DPR`) and extracting balanced, filtered subsets.
