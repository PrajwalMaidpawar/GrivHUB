# GrievanceHUB Enterprise — Live Demo & Walkthrough Guide

**Project Name:** GrievanceHUB - AI-Powered Civic Grievance Management System  
**Audience:** Municipal Commissioners, Department Heads, System Administrators, Citizens  
**Demo Duration:** 15–20 Minutes  

---

## 1. Demo Personas & Credentials

The system provides built-in quick role switching or credentials:

| Persona | Role | Department / Jurisdiction | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Aarav Sharma** | `CITIZEN` | Ward 150 - Bellandur | Submit grievances, track timeline, confirm resolution, reopen |
| **Ramesh Kumar** | `OFFICER` | Water Supply (DEP-WATER), Ward 150 | Start work, post updates, submit resolution, manage workload |
| **Priya Sundaram** | `OFFICER` | Roads & Infra (DEP-ROADS), Ward 150 | Inspect road complaints, request reassignment, manage availability |
| **Executive Admin** | `ADMIN` | Municipal Headquarters (All Depts) | System oversight, manual dispatch, ML confusion matrix, CSV reports |

---

## 2. Walkthrough Scenario 1: The Citizen Journey

### Step 1.1: Authentication & Citizen Dashboard
1. Select the **Citizen** persona in the header role switcher or login.
2. Observe the Citizen Portal showing:
   - Active Grievance Counters (Submitted, In Progress, Resolved).
   - Recent grievance activity feed with SLA countdowns.
   - Quick action: **"File New Grievance"**.

### Step 1.2: Submitting a Grievance with Real Local ML Classification
1. Click **File New Grievance**.
2. Enter the test grievance:
   - **Title:** `Severe Drinking Water Contamination and Low Pressure`
   - **Description:** `The water coming from the main supply line is turbid and smells of sewage since yesterday morning. Over 50 households in 4th Cross are affected.`
   - **Zone:** `Mahadevapura` | **Ward:** `Ward 150 - Bellandur`
   - **Address:** `4th Cross, Near Community Park, Bellandur, Bengaluru - 560103`
3. Click **Submit Grievance**.
4. **Observe Real ML Output:**
   - Classification: `Water Supply`
   - Confidence: `> 92%` (Auto-Classified)
   - Intelligent Routing: Automatically assigned to Officer **Ramesh Kumar** (Water Supply Department).
   - SLA Target: 24-48 Hours.

---

## 3. Walkthrough Scenario 2: The Ward Officer Workflow

### Step 2.1: Officer Portal & Queue Inspection
1. Switch role to **Officer (Ramesh Kumar - Water Supply)**.
2. Observe the Officer Dashboard:
   - Assigned Active Cases: Visible in the queue.
   - Workload Index: Displays current active load vs. maximum capacity (e.g., 3/10).
   - Availability Status: Toggle between `AVAILABLE`, `BUSY`, or `ON_LEAVE`.

### Step 2.2: Starting Work & Evidence Logging
1. Click on the newly submitted water supply grievance (`GRV-...`).
2. Click **Start Work**.
   - Status transitions from `ASSIGNED` to `IN_PROGRESS`.
   - Timeline is updated in real time.
3. Post a progress update:
   - **Note:** `Pipeline inspection team dispatched with water sampling kit. Valve replacement scheduled.`
   - Visibility: `Citizen-Visible`.

### Step 2.3: Submitting Resolution
1. Once work is completed, click **Submit Resolution**.
2. Provide resolution details:
   - **Resolution Remarks:** `Contamination resolved. Broken valve replaced at 4th Cross junction. Water tested clear.`
   - **Action Taken:** `Replaced 50mm valve and flushed the feeder line.`
3. Click **Confirm Resolution**. Status transitions to `RESOLVED_PENDING_CONFIRMATION`.

---

## 4. Walkthrough Scenario 3: Citizen Confirmation & Closure

1. Switch back to **Citizen (Aarav Sharma)**.
2. Open the grievance details.
3. Observe the **Resolution Review Card**:
   - Displays officer's action report and timestamp.
4. Click **Confirm Resolution & Rate Service**:
   - Provide a 5-Star Rating and Feedback: `Quick response and clear drinking water restored within 24 hours. Excellent!`
5. Status transitions to `CLOSED_RESOLVED`.

---

## 5. Walkthrough Scenario 4: Administrator Oversight & ML Analytics

### Step 5.1: Municipal Command Center
1. Switch role to **Administrator**.
2. Review system-wide metrics:
   - Total Grievances, Resolution Rate (%), Average SLA Compliance.
   - Live Department Queues: Roads, Water Supply, Solid Waste, Electricity, Drainage.

### Step 5.2: ML Confidence & Confusion Matrix Analytics
1. Navigate to **AI & Analytics > ML Model Performance**.
2. Inspect:
   - **Real Confusion Matrix:** Formed dynamically from reviewed and human-verified grievances.
   - **Confidence Score Distribution:** High-confidence auto-assigned vs. low-confidence reviewed cases.
   - **Human Feedback Loop:** Review category overrides and retraining candidate records.

### Step 5.3: Data Export & Audit Trail
1. Navigate to **Audit Logs**:
   - View explainable routing decisions with exact rule criteria and officer workload tie-breakers.
2. Click **Export Report (CSV / JSON)** to download official municipal compliance summaries.

---

## 6. Pre-Tested Sample Prompts for Live Demos

| Category | Sample Title | Sample Description | Expected Prediction |
| :--- | :--- | :--- | :--- |
| **Roads & Infra** | Deep pothole causing bike accidents | Large open crater in middle of 80ft road near signal. Asphalt has caved in. | `Roads and Infrastructure` (>88%) |
| **Solid Waste** | Overflowing garbage dumpster | Garbage pile has not been cleared for 4 days. Stray animals scattering waste. | `Solid Waste Management` (>90%) |
| **Electricity** | Streetlights flickering and dark | Entire lane from 3rd to 7th Main is in complete darkness. Streetlights are dead. | `Electricity and Streetlighting` (>91%) |
| **Drainage** | Storm water drain clogged and overflowing | Pre-monsoon rain has blocked the open gutter. Dirty water backing up into compounds. | `Drainage and Sewage` (>89%) |
| **General Civic** | Civic inquiry regarding park timings | Request to extend morning opening hours of the public walking track. | `General Civic Services` (Low conf -> Review Queue) |
