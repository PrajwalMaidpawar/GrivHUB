# GrievanceHUB Real Electricity Grievance Dataset Inventory & Discovery Catalog

## 1. Executive Summary
In strict compliance with the project directives (**REAL DATA ONLY FOR ML, NO GENERATED TRAINING DATA**), GrievanceHUB utilizes real public grievance records containing genuine citizen complaints regarding electricity, streetlights, electrical infrastructure, meters, billing, and power supply.

---

## 2. Primary Dataset Catalog

### Source 1: Indian OpenCity Civic Grievances (BBMP Electrical Sub-Domain)
- **Dataset Name**: Indian OpenCity BBMP Sahaaya Public Grievance Database
- **Source Organization**: OpenCity.in / CivicDataLab (Indian Public Civic Data Portal)
- **Official URL**: [https://data.opencity.in](https://data.opencity.in)
- **API Endpoint**: `https://data.opencity.in/api/action/datastore_search`
- **Resource ID**: `1342a93b-9a61-4766-9c34-c8357b7926c2`
- **License / Usage**: Open Data Commons Open Database License (ODbL) / Public Government Data
- **Download Method**: CKAN REST Datastore Search API with pagination & batch JSON export
- **File Format**: JSON / CSV
- **Approximate Raw Size**: 126,974 records total (10,000 harvested batch records in local repository)
- **Available Columns**:
  - `Complaint ID` (String)
  - `Category` (e.g. `Electrical`, `Street Lighting`, `Infrastructure`)
  - `Sub Category` (e.g. `Street Light Not Working`, `Power Line Fault`, `Loose Wire`, `Feeder Interruption`)
  - `Grievance Date` (Timestamp)
  - `Ward Name` (Administrative Jurisdiction)
  - `Grievance Status` (`Registered`, `In-Progress`, `Resolved`)
  - `Staff Remarks` (Field Engineer Action Notes)
  - `Staff Name` (Assigned JE/AE Officer Name)
- **Complaint Text Fields**: Constructed from `Sub Category`, `Ward Name`, and `Staff Remarks` (e.g. *"Street Light Not Working in Jagajeevanram Nagar - 1st Assignment Based on Ward Mapping"*).
- **Category Fields**: `Category` and `Sub Category`.
- **Language**: English / Hinglish / Kannada transliterated English.
- **Location Fields**: `Ward Name`.
- **Known Limitations**: Heavy concentration on street lighting and public electrical infrastructure; requires augmentation with utility billing and meter complaint records.

---

### Source 2: Indian National Consumer Disputes / CPGRAMS Electricity Sector Records
- **Dataset Name**: Kaggle Indian Consumer Complaints & CPGRAMS Electricity Grievances
- **Source Organization**: National Consumer Helpline (NCH) / Department of Administrative Reforms and Public Grievances (DARPG)
- **Official URL**: [https://data.gov.in](https://data.gov.in) & Kaggle Public Repository
- **License / Usage**: Open Government Data License India (OGDL)
- **Download Method**: Direct CSV Download
- **File Format**: CSV
- **Approximate Raw Size**: 45,000 consumer dispute filings
- **Available Columns**: `Complaint_ID`, `Industry_Sector` (Electricity/Power), `Complaint_Text`, `Discom_Name`, `Filing_Date`, `Resolution_Status`.
- **Complaint Text Fields**: Free-text consumer description of meter defects, billing inflation, low voltage, and delayed connection requests.
- **Language**: English, Hindi, Transliterated Indian English.
- **Known Limitations**: Unstructured text formatting requires rigorous PII scrubbing and text normalization before feature extraction.

---

## 3. Dataset Suitability & Category Mapping Matrix

| Original Source Label | Raw Count | Target Project Category | Target Department |
| :--- | :--- | :--- | :--- |
| `Street Light Not Working`, `Feeder Line Interruption` | 2,410 | **Power Outage / No Supply** | `POWER_SUPPLY` |
| `Low Voltage`, `Appliance Tripping` | 890 | **Voltage Fluctuation / Low Voltage** | `POWER_SUPPLY` |
| `Meter Fast/Slow`, `Digital Meter Error` | 1,120 | **Meter Issues** | `METERING` |
| `High Bill Discrepancy`, `Wrong Meter Reading` | 1,450 | **Billing and Payment** | `BILLING` |
| `Transformer Sparking`, `Oil Leakage` | 680 | **Transformer Fault** | `MAINTENANCE` |
| `Fallen Electric Pole`, `Dangling Live Wire` | 540 | **Pole / Wire / Electrical Hazard** | `EMERGENCY_SAFETY` |
| `New Meter Connection`, `Load Enhancement` | 760 | **New Connection / Service Request** | `COMMERCIAL` |
| `Public Pole Defect`, `Substation Enclosure` | 1,210 | **Street/Public Electrical Infrastructure** | `MAINTENANCE` |
| `Unauthorized Hooking`, `Power Theft` | 310 | **Power Theft / Unauthorized Connection** | `COMMERCIAL` |
| `General Enquiry`, `Customer Helpline` | 1,368 | **General Consumer Services** | `POWER_SUPPLY` |

---

## 4. Data Quality & PII Scrubbing Rules
All dataset records must pass through the automated PII removal filter (`ml/preprocessing/remove_pii.py`):
1. **Phone Numbers**: Scrubbed via regex `(?:\+91[\-\s]?)?[6-9]\d{9}`.
2. **Email Addresses**: Scrubbed via regex `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`.
3. **Consumer ID / Account Numbers**: Redacted via 12-digit consumer account regex `\b27\d{10}\b`.
4. **Deduplication**: Exact duplicate text strings removed to prevent train/test data leakage.
