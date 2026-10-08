# Preliminary Category Mapping Report: GrievanceHUB Target Taxonomy

**Analysis Date:** 2026-08-21  
**Target Taxonomy:** 8 GrievanceHUB Municipal Utility Classes

---

## 1. Category Mapping Matrix (Empirically Verified from API Data)

### 1. Water Supply
- **GrievanceHUB Class:** `WATER_SUPPLY`
- **Indian OpenCity Mapping:**
  - `Water Supply` $\rightarrow$ **DIRECT MATCH**
  - `BWSSB / Water related` $\rightarrow$ **DIRECT MATCH**
  - `Water leakage / pipeline burst` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Water System` / `Water Maintenance` $\rightarrow$ **DIRECT MATCH**
  - `Water Quality` $\rightarrow$ **DIRECT MATCH**
  - `Dirty Water` / `No Water` / `Fire Hydrant Running` $\rightarrow$ **DIRECT MATCH**

---

### 2. Roads and Infrastructure
- **GrievanceHUB Class:** `ROADS_INFRASTRUCTURE`
- **Indian OpenCity Mapping:**
  - `Road Maintenance(Engg) -> Potholes` $\rightarrow$ **DIRECT MATCH**
  - `Road Maintenance(Engg) -> Road side drains` $\rightarrow$ **POSSIBLE MATCH** (May bridge Drainage)
  - `Road Maintenance(Engg) -> footpath encroachment` $\rightarrow$ **DIRECT MATCH**
  - `Road Maintenance(Engg) -> Damaged Footpath / Pavement` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Street Condition` (Potholes, Cave-in, Defective Street) $\rightarrow$ **DIRECT MATCH**
  - `Sidewalk Condition` $\rightarrow$ **DIRECT MATCH**
  - `Highway Condition` $\rightarrow$ **DIRECT MATCH**

---

### 3. Sanitation and Waste Management
- **GrievanceHUB Class:** `SANITATION_WASTE`
- **Indian OpenCity Mapping:**
  - `Solid Waste (Garbage) Related -> Garbage dump` $\rightarrow$ **DIRECT MATCH**
  - `Solid Waste (Garbage) Related -> Garbage vehicle not arrived` $\rightarrow$ **DIRECT MATCH**
  - `Solid Waste (Garbage) Related -> Garbage dumping in vacant sites` $\rightarrow$ **DIRECT MATCH**
  - `Solid Waste (Garbage) Related -> Dead animal(s)` $\rightarrow$ **DIRECT MATCH**
  - `Solid Waste (Garbage) Related -> Sweeping not done` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Sanitation Condition` / `Dirty Condition` $\rightarrow$ **DIRECT MATCH**
  - `Missed Collection` (Trash / Recycling / Compost) $\rightarrow$ **DIRECT MATCH**
  - `Illegal Dumping` $\rightarrow$ **DIRECT MATCH**
  - `Dead Animal` $\rightarrow$ **DIRECT MATCH**

---

### 4. Drainage and Sewage
- **GrievanceHUB Class:** `DRAINAGE_SEWAGE`
- **Indian OpenCity Mapping:**
  - `Storm  Water Drain(SWD) -> Sewerage water left in SWD` $\rightarrow$ **DIRECT MATCH**
  - `Storm  Water Drain(SWD) -> SWD cleaning / desilting` $\rightarrow$ **DIRECT MATCH**
  - `Storm  Water Drain(SWD) -> Retaining wall collapse` $\rightarrow$ **POSSIBLE MATCH**
  - `Road Maintenance(Engg) -> Overflowing Gutter` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Sewer` (Catch Basin Clogged, Sewer Backup, Street Flooding) $\rightarrow$ **DIRECT MATCH**
  - `Industrial Waste / Sewage Spill` $\rightarrow$ **DIRECT MATCH**

---

### 5. Street Lighting and Electrical Infrastructure
- **GrievanceHUB Class:** `STREET_LIGHTING`
- **Indian OpenCity Mapping:**
  - `Electrical -> Street Light Not Working` $\rightarrow$ **DIRECT MATCH**
  - `Electrical -> Requirement For New Street Lights` $\rightarrow$ **DIRECT MATCH**
  - `Electrical -> Exposed Wire / Damaged Pole` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Street Light Condition` (Lamp Out, Wire Exposed, Pole Down) $\rightarrow$ **DIRECT MATCH**
  - `Traffic Signal Condition` $\rightarrow$ **POSSIBLE MATCH** (can bridge Traffic/Electrical)

---

### 6. Parks and Environment
- **GrievanceHUB Class:** `PARKS_ENVIRONMENT`
- **Indian OpenCity Mapping:**
  - `Forest -> Removal of dead/fallen trees` $\rightarrow$ **DIRECT MATCH**
  - `Forest -> obstructions Branches / Trees.` $\rightarrow$ **DIRECT MATCH**
  - `Forest -> Illegal Tree Felling` $\rightarrow$ **DIRECT MATCH**
  - `Parks and Play grounds -> Maintenance / Broken Equipment` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Damaged Tree` / `Overgrown Tree/Branches` / `Dead Tree` $\rightarrow$ **DIRECT MATCH**
  - `Maintenance or Facility` (Park Grounds, Playgrounds) $\rightarrow$ **DIRECT MATCH**
  - `Air Quality` / `Noise` $\rightarrow$ **POSSIBLE MATCH**

---

### 7. Transportation and Traffic Infrastructure
- **GrievanceHUB Class:** `TRANSPORT_TRAFFIC`
- **Indian OpenCity Mapping:**
  - `Traffic Engineering -> Signal not working` $\rightarrow$ **DIRECT MATCH**
  - `Traffic Engineering -> Speed breaker repair` $\rightarrow$ **DIRECT MATCH**
  - `Traffic Engineering -> Sign board missing` $\rightarrow$ **DIRECT MATCH**
  - `Bus Shelter Maintenance` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Traffic Signal Condition` $\rightarrow$ **DIRECT MATCH**
  - `Blocked Driveway` / `Illegal Parking` $\rightarrow$ **DIRECT MATCH**
  - `Bus Stop Shelter Placement / Condition` $\rightarrow$ **DIRECT MATCH**
  - `Street Sign - Missing / Damaged` $\rightarrow$ **DIRECT MATCH**

---

### 8. General Civic Services
- **GrievanceHUB Class:** `GENERAL_CIVIC`
- **Indian OpenCity Mapping:**
  - `veterinary -> Stray dog related complaints` $\rightarrow$ **DIRECT MATCH**
  - `veterinary -> Animal Rescue / Vaccination` $\rightarrow$ **DIRECT MATCH**
  - `Health Dept -> Unhygienic premises in hospital / commercial` $\rightarrow$ **DIRECT MATCH**
  - `E khata / Khata services -> Ekhata missing online` $\rightarrow$ **DIRECT MATCH**
  - `Advertisement -> Illegal Banners / Hoardings` $\rightarrow$ **DIRECT MATCH**
- **NYC 311 Mapping:**
  - `Rodent` / `Animal-Abuse` / `Animal in a Park` $\rightarrow$ **DIRECT MATCH**
  - `Consumer Complaint` / `Building/Use` $\rightarrow$ **DIRECT MATCH**
  - `Public Toilet Condition` $\rightarrow$ **DIRECT MATCH**

---

## 2. Excluded / Out-of-Scope Categories

The following categories exist in raw datasets but will be excluded from the 8-class core municipal schema:
- `Taxi / For-Hire Vehicle Complaints` (TLC in NYC - non-municipal transit authority)
- `Homeless Encampment Assistance` (DHS specialized social welfare dispatch)
- `Building Internal Paint / Plaster / Elevator / Heat / Hot Water` (Private residential landlord tenant disputes under HPD)
- `Residential Indoor Noise` (NYPD private domestic disputes)
