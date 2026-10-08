# API Connectivity Report: GrievanceHUB External Datasets

**Execution Date:** 2026-08-21T10:51:26Z  
**Verification Tool:** `ml/acquisition/test_dataset_apis.py` & `ml/acquisition/inspect_categories.py`

---

## 1. Executive Summary

Both real-world dataset API endpoints were tested for live connectivity, status response codes, payload structure, pagination mechanics, and schema compatibility. Both endpoints are active, reachable, and returned valid JSON data.

| Metric / Attribute | Dataset Source 1 (NYC 311 OpenData) | Dataset Source 2 (Indian OpenCity Grievances) |
| :--- | :--- | :--- |
| **API Endpoint** | `https://data.cityofnewyork.us/resource/erm2-nwe9.json` | `https://data.opencity.in/api/action/datastore_search` |
| **Dataset Identifier** | `erm2-nwe9` | `1342a93b-9a61-4766-9c34-c8357b7926c2` |
| **HTTP Status Code** | **200 OK** | **200 OK** |
| **API Engine** | Socrata Open Data API (SODA v2) | CKAN Datastore API (v3) |
| **Live Record Count** | > 35,000,000 records | **126,974 records** (Total in resource) |
| **Connectivity Result** | **SUCCESS** | **SUCCESS** |

---

## 2. Dataset Source 1: NYC 311 Service Requests

### Connection Parameters
- **Endpoint Tested:** `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=5`
- **Response Format:** JSON Array of record objects.
- **Fields Detected (35+ columns):**
  - Identifiers: `unique_key`
  - Timestamps: `created_date`, `closed_date`, `resolution_action_updated_date`
  - Agencies: `agency`, `agency_name`
  - Categorization: `complaint_type`, `descriptor`, `descriptor_2`
  - Location: `incident_zip`, `incident_address`, `street_name`, `city`, `borough`, `latitude`, `longitude`, `location`
  - Operational: `status`, `resolution_description`

### Sample Actual Live Record
```json
{
  "unique_key": "70115201",
  "created_date": "2026-08-20T01:50:46.000",
  "agency": "DEP",
  "agency_name": "Department of Environmental Protection",
  "complaint_type": "Water Maintenance",
  "descriptor": "Fire Hydrant Running Full",
  "location_type": "Sidewalk",
  "incident_zip": "10472",
  "incident_address": "1963 WATSON AVENUE",
  "city": "BRONX",
  "borough": "BRONX",
  "status": "In Progress",
  "latitude": "40.82876638164466",
  "longitude": "-73.85805712987411"
}
```

---

## 3. Dataset Source 2: Indian OpenCity Civic Grievances

### Connection Parameters
- **Endpoint Tested:** `https://data.opencity.in/api/action/datastore_search?resource_id=1342a93b-9a61-4766-9c34-c8357b7926c2&limit=5`
- **Response Format:** CKAN standard wrapper `{"help": "...", "success": true, "result": {"records": [...], "total": 126974}}`
- **Fields Detected (9 columns):**
  1. `_id` (Integer index)
  2. `Complaint ID` (Municipal tracking token, e.g., "20771690")
  3. `Category` (High-level municipal department/service, e.g., "Electrical", "Solid Waste (Garbage) Related", "Road Maintenance(Engg)")
  4. `Sub Category` (Specific problem description, e.g., "Street Light Not Working", "Garbage dump", "Potholes", "footpath encroachment")
  5. `Grievance Date` (Timestamp, e.g., "2025-06-19 10:39:00")
  6. `Ward Name` (Indian Municipal Ward, e.g., "Jagajeevanram Nagar", "Kammanahalli", "Banaswadi")
  7. `Grievance Status` (Status lifecycle, e.g., "Registered", "In Progress", "Closed")
  8. `Staff Remarks` (Official administrative routing notes, e.g., "1st Assignment Based on Ward Mapping")
  9. `Staff Name` (Designation & Officer, e.g., "syed zameer/JE", "Marshal Ward No 27/Marshal", "AE Ward 124/AE")

### Sample Actual Live Record
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

---

## 4. Key Verification Findings

1. **Authentic Indian Municipal Corpus Verified:** 
   The OpenCity dataset (Resource ID `1342a93b-9a61-4766-9c34-c8357b7926c2`) contains **126,974 real municipal grievance records from Bruhat Bengaluru Mahanagara内部/Karnataka Municipal Corporation (BBMP Sahaaya)**. It features authentic Indian ward names, municipal engineering roles (`JE`, `AE`, `ARO`, `Marshal`), and real civic category taxonomies.
2. **Text Representation in OpenCity:**
   The OpenCity dataset combines `Category` and `Sub Category` as structured problem indicators, along with administrative routing logs.
3. **NYC 311 Scale & Specificity:**
   The NYC 311 dataset provides granular problem descriptors (`complaint_type` + `descriptor` + `resolution_description`) across millions of records.
