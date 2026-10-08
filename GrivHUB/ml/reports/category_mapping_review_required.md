# Category Mapping Review Required Report

**Inspection Date:** 2026-08-21  
**Target Architecture:** 8 GrievanceHUB Municipal Utility Classes  
**Datasets Analyzed:** Indian OpenCity (BBMP Sahaaya, 10,000 records) & NYC 311 (Filtered Infrastructure, 10,000 records)

---

## 1. Direct Mappings Ready for Use

The following source categories possess direct, unambiguous semantic mappings to GrievanceHUB classes and are ready for automated ingestion:

| GrievanceHUB Category | Indian OpenCity Source Categories | NYC 311 Source Categories | Total Records |
| :--- | :--- | :--- | :--- |
| **1. Water Supply** | `Water Supply` (4) | `Water System`, `Water Maintenance`, `Water Quality` (808) | **812** |
| **2. Roads & Infrastructure** | `Road Maintenance(Engg) -> Potholes`, `asphalting`, `footpath` (844) | `Street Condition`, `Sidewalk Condition`, `Highway Condition`, `Curb Condition` (1,707) | **2,551** |
| **3. Sanitation & Waste Management** | `Solid Waste (Garbage) Related -> Garbage dump`, `vehicle not arrived`, `dead animal`, `sweeping` (4,040) | `Sanitation Condition`, `Dirty Condition`, `Missed Collection`, `Illegal Dumping`, `Dead Animal` (1,987) | **6,027** |
| **4. Drainage & Sewage** | `Storm  Water Drain(SWD) -> Sewerage in SWD`, `SWD desilting` (96) | `Sewer` (Catch Basin Clogged, Sewer Backup, Street Flooding) (366) | **462** |
| **5. Street Lighting & Electrical** | `Electrical -> Street Light Not Working`, `Requirement For New Street Lights` (2,626) | `Street Light Condition` (Lamp Out, Pole Down, Wire Exposed) (507) | **3,133** |
| **6. Parks & Environment** | `Forest -> Removal of dead/fallen trees`, `obstruction branches`, `Illegal Tree Felling` (654) | `Damaged Tree`, `Dead Tree`, `Overgrown Tree/Branches`, `Maintenance or Facility` (1,224) | **1,878** |
| **7. Transport & Traffic Infra** | *(Indian dataset traffic signals are listed under TEC)* | `Traffic Signal Condition`, `Street Sign - Missing/Damaged`, `Bus Stop Shelter` (630) | **630** |
| **8. General Civic Services** | `veterinary -> Stray dog related complaints`, `Animal Rescue`, `Public Toilet Cleanliness` (493) | `Public Toilet Condition`, `Animal in a Park`, `Rodent` (46) | **539** |

---

## 2. Possible Mappings Requiring Review & Confirmation

The following categories have a plausible municipal home but require explicit confirmation:

1. **`Road Maintenance(Engg) -> footpath encroachment` (266 Indian records):**
   - *Proposed Target:* `Roads and Infrastructure` (Pedestrian infrastructure obstruction).
   - *Alternative:* `General Civic Services`.
2. **`Blocked Driveway` / `Illegal Parking` / `Derelict Vehicles` (297 NYC records):**
   - *Proposed Target:* `Transportation and Traffic Infrastructure` (Right-of-way street blockage).
   - *Alternative:* `General Civic Services`.
3. **`E khata / Khata services` & `Revenue Department` (767 Indian records):**
   - *Proposed Target:* `General Civic Services` (Civic property tax & certificate records).
   - *Alternative:* `EXCLUDED` (Administrative / back-office clerical).
4. **`Dirty Water` / `Private Water Leak` (47 NYC records):**
   - *Proposed Target:* `Water Supply`.

---

## 3. Explicitly Excluded Categories

To prevent label noise, the following records are strictly **EXCLUDED**:
- **NYC 311 (2,381 records excluded):**
  - Private Landlord Tenant disputes: `PAINT/PLASTER`, `FLOORING/STAIRS`, `HEAT/HOT WATER`, `DOOR/WINDOW`, `ELEVATOR`, `PLUMBING` (HPD residential code enforcement).
  - Social Welfare: `Encampment`, `Homeless Person Assistance` (DHS).
  - Domestic noise: `Noise - Residential`, `Noise - Street/Sidewalk`, `Noise - Helicopter`.
- **Indian OpenCity (110 records excluded):**
  - Non-municipal / unassigned tokens: `Others -> general`, `Information Technology -> internal software issue`.

---

## 4. Category Coverage & Record Counts

| GrievanceHUB Target Category | Indian Dataset Records | NYC Dataset Records | Combined Usable Records | Coverage Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **1. Water Supply** | 4 | 855 | **859** | **Moderate Coverage** |
| **2. Roads and Infrastructure** | 1,110 | 1,707 | **2,817** | **Strong Coverage** |
| **3. Sanitation & Waste Management** | 4,111 | 1,987 | **6,098** | **Strong Coverage** |
| **4. Drainage and Sewage** | 96 | 366 | **462** | **Moderate Coverage** |
| **5. Street Lighting & Electrical** | 2,632 | 507 | **3,139** | **Strong Coverage** |
| **6. Parks and Environment** | 669 | 1,224 | **1,893** | **Strong Coverage** |
| **7. Transportation & Traffic Infra** | 8 | 927 | **935** | **Moderate Coverage** |
| **8. General Civic Services** | 1,260 | 46 | **1,306** | **Strong Coverage** |
| **Total Usable Records** | **9,890** | **7,619** | **17,509** | **Excellent Balance** |
| **Total Excluded Noise Records** | **110** | **2,381** | **2,491** | Filtered Cleanly |

---

## 5. Data Gap & Complementarity Analysis

1. **Complementary Strengths:**
   - The **Indian OpenCity dataset** is rich in *Sanitation & Waste Management* (4,111), *Street Lighting* (2,632), *Roads* (1,110), *Parks/Fallen Trees* (669), and *Civic Services/Dog Menace* (1,260).
   - The **NYC 311 dataset** provides deep support for *Water Supply* (855), *Drainage & Sewers* (366), and *Transportation & Traffic Signals* (927).
2. **Identified Data Gaps & Strategy:**
   - *Water Supply & Drainage in Indian Data:* The BBMP dataset focuses heavily on solid waste, roads, and streetlights because drinking water and sewerage in Bengaluru are handled by a separate parastatal agency (**BWSSB**). NYC 311 bridges this exact gap seamlessly with 1,221 verified municipal water and sewer records.
   - *Language & Terminology:* The Indian corpus incorporates authentic Indian urban terms (*"Potholes"*, *"SWD"*, *"footpath encroachment"*, *"JE"*, *"AE"*, *"Marshal"*, *"Khata"*, *"Ward"*), while NYC provides standard English phrasing for civil infrastructure.
