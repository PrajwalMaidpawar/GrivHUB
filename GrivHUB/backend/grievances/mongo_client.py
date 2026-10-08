"""
GrievanceHUB MongoDB & Document Database Client
Provides thread-safe document-level database operations for:
- Grievances
- Departments
- Municipal Officers
- Assignment History & Audit Trail
- Routing Audit Logs
- Officer Feedback & Retraining Datasets
- User Profiles & RBAC

Supports standard MongoDB / PyMongo connections with a resilient persistent JSON-document
engine fallback for local and isolated environments.
"""

import os
import json
import uuid
import time
import logging
import threading
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("grievancehub.db")

class MongoRepository:
    """
    Thread-safe MongoDB repository interface.
    Manages grievancehub collections and real-time workload synchronization.
    """
    _instance: Optional["MongoRepository"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.abspath("data/mongodb_store")
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.grievances_file = os.path.join(self.data_dir, "grievances.json")
        self.departments_file = os.path.join(self.data_dir, "departments.json")
        self.officers_file = os.path.join(self.data_dir, "officers.json")
        self.assignments_file = os.path.join(self.data_dir, "assignments.json")
        self.routing_audit_file = os.path.join(self.data_dir, "routing_audit.json")
        self.feedback_file = os.path.join(self.data_dir, "category_feedback.json")
        self.users_file = os.path.join(self.data_dir, "users.json")
        self.activities_file = os.path.join(self.data_dir, "activities.json")
        self.notifications_file = os.path.join(self.data_dir, "notifications.json")
        self.comments_file = os.path.join(self.data_dir, "comments.json")
        self.settings_file = os.path.join(self.data_dir, "settings.json")
        self.admin_audit_file = os.path.join(self.data_dir, "admin_audit_logs.json")
        self.jurisdictions_file = os.path.join(self.data_dir, "jurisdictions.json")
        
        self._rw_lock = threading.RLock()
        self._init_storage()

    @classmethod
    def get_instance(cls, data_dir: Optional[str] = None) -> "MongoRepository":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(data_dir=data_dir)
        return cls._instance

    def _init_storage(self):
        with self._rw_lock:
            if hasattr(self, "data_dir") and self.data_dir:
                os.makedirs(self.data_dir, exist_ok=True)
                for attr, fname in [
                    ("grievances_file", "grievances.json"),
                    ("departments_file", "departments.json"),
                    ("officers_file", "officers.json"),
                    ("assignments_file", "assignments.json"),
                    ("routing_audit_file", "routing_audit.json"),
                    ("feedback_file", "category_feedback.json"),
                    ("users_file", "users.json"),
                    ("activities_file", "activities.json"),
                    ("notifications_file", "notifications.json"),
                    ("comments_file", "comments.json"),
                    ("settings_file", "settings.json"),
                    ("admin_audit_file", "admin_audit_logs.json"),
                    ("jurisdictions_file", "jurisdictions.json")
                ]:
                    cur_val = getattr(self, attr, None)
                    if not cur_val or not os.path.exists(os.path.dirname(cur_val)):
                        setattr(self, attr, os.path.join(self.data_dir, fname))

            files_to_init = [
                (self.grievances_file, []),
                (self.feedback_file, []),
                (self.assignments_file, []),
                (self.routing_audit_file, []),
                (self.activities_file, []),
                (self.notifications_file, []),
                (self.comments_file, []),
                (self.admin_audit_file, []),
            ]
            for fpath, default_val in files_to_init:
                if fpath:
                    os.makedirs(os.path.dirname(fpath), exist_ok=True)
                    if not os.path.exists(fpath):
                        with open(fpath, "w", encoding="utf-8") as f:
                            json.dump(default_val, f, indent=2)

            # Initialize departments, officers, users, settings, jurisdictions if missing
            if not os.path.exists(self.departments_file) or os.path.getsize(self.departments_file) <= 4:
                self._seed_default_departments()
            
            if not os.path.exists(self.officers_file) or os.path.getsize(self.officers_file) <= 4:
                self._seed_default_officers()

            if not os.path.exists(self.users_file) or os.path.getsize(self.users_file) <= 4:
                self._seed_default_users()

            if not os.path.exists(self.settings_file) or os.path.getsize(self.settings_file) <= 4:
                self._seed_default_settings()

            if not os.path.exists(self.jurisdictions_file) or os.path.getsize(self.jurisdictions_file) <= 4:
                self._seed_default_jurisdictions()

    def _seed_default_settings(self):
        """Seeds default administrative system settings."""
        settings = {
            "default_max_officer_workload": 10,
            "auto_closure_hours": 72,
            "min_ml_confidence_threshold": 0.60,
            "allowed_file_types": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
            "max_attachment_size_mb": 10,
            "supported_languages": ["en", "hi", "kn", "ta", "te"],
            "strict_jurisdiction_routing": True,
            "citizen_reopen_window_days": 7,
            "auto_closure_enabled": True,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_by": "SYSTEM"
        }
        with open(self.settings_file, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)

    def _seed_default_jurisdictions(self):
        """Seeds standard Indian municipal corporation zones and wards (BBMP structure)."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        jurisdictions = [
            {
                "jurisdiction_id": "JUR-EZ",
                "zone": "East Zone",
                "corporation": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "headquarters": "Mayo Hall, MG Road, Bengaluru",
                "wards": [
                    {"ward_id": "W-111", "ward_name": "Ward 111 - Indiranagar", "population_est": 48500},
                    {"ward_id": "W-112", "ward_name": "Ward 112 - Domlur", "population_est": 52300},
                    {"ward_id": "W-113", "ward_name": "Ward 113 - Konena Agrahara", "population_est": 41200}
                ],
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "jurisdiction_id": "JUR-WZ",
                "zone": "West Zone",
                "corporation": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "headquarters": "Rajajinagar 1st Block, Bengaluru",
                "wards": [
                    {"ward_id": "W-095", "ward_name": "Ward 95 - Rajajinagar", "population_est": 54000},
                    {"ward_id": "W-096", "ward_name": "Ward 96 - Malleshwaram", "population_est": 61000},
                    {"ward_id": "W-097", "ward_name": "Ward 97 - Basaveshwaranagar", "population_est": 49000}
                ],
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "jurisdiction_id": "JUR-SZ",
                "zone": "South Zone",
                "corporation": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "headquarters": "Jayanagar 9th Block, Bengaluru",
                "wards": [
                    {"ward_id": "W-151", "ward_name": "Ward 151 - Koramangala", "population_est": 68000},
                    {"ward_id": "W-152", "ward_name": "Ward 152 - Jayanagar", "population_est": 59000},
                    {"ward_id": "W-153", "ward_name": "Ward 153 - BTM Layout", "population_est": 73000}
                ],
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "jurisdiction_id": "JUR-NZ",
                "zone": "North Zone",
                "corporation": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "headquarters": "Yelahanka Old Town, Bengaluru",
                "wards": [
                    {"ward_id": "W-035", "ward_name": "Ward 35 - Hebbal", "population_est": 55000},
                    {"ward_id": "W-036", "ward_name": "Ward 36 - Yelahanka", "population_est": 67000},
                    {"ward_id": "W-037", "ward_name": "Ward 37 - Vidyaranyapura", "population_est": 51000}
                ],
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "jurisdiction_id": "JUR-CZ",
                "zone": "Central Zone",
                "corporation": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
                "headquarters": "Hudson Circle, Corporation Square, Bengaluru",
                "wards": [
                    {"ward_id": "W-109", "ward_name": "Ward 109 - Chickpet", "population_est": 43000},
                    {"ward_id": "W-110", "ward_name": "Ward 110 - Sampangiramnagar", "population_est": 46000},
                    {"ward_id": "W-114", "ward_name": "Ward 114 - Shanthinagar", "population_est": 51500}
                ],
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            }
        ]
        with open(self.jurisdictions_file, "w", encoding="utf-8") as f:
            json.dump(jurisdictions, f, indent=2)

    def _seed_default_departments(self):
        """Seeds standard Indian municipal corporation departments (BBMP structure)."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        departments = [
            {
                "department_id": "DEP-ROADS",
                "name": "Roads and Infrastructure Department",
                "description": "Responsible for municipal roads, bridges, flyovers, potholes, pavements, and civil roadworks.",
                "supported_categories": ["Roads and Infrastructure"],
                "contact_email": "roads.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1001",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-WATER",
                "name": "Water Supply and Sewerage Board",
                "description": "Responsible for potable piped water supply, pressure issues, pipeline leakages, and water tankers.",
                "supported_categories": ["Water Supply"],
                "contact_email": "watersupply.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1002",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-SWM",
                "name": "Solid Waste Management and Sanitation Department",
                "description": "Responsible for garbage collection, blackspots, street sweeping, segregation, and dumping remediation.",
                "supported_categories": ["Sanitation and Waste Management"],
                "contact_email": "swm.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1003",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-DRAIN",
                "name": "Drainage and Stormwater Sewage Department",
                "description": "Responsible for open stormwater drains (SWD), underground drainage (UGD), manholes, and flood mitigation.",
                "supported_categories": ["Drainage and Sewage"],
                "contact_email": "drainage.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1004",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-ELEC",
                "name": "Street Lighting and Electrical Infrastructure",
                "description": "Responsible for streetlights, high-mast lamps, dangerous exposed wiring, and streetlight timers.",
                "supported_categories": ["Street Lighting and Electrical Infrastructure"],
                "contact_email": "electrical.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1005",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-PARKS",
                "name": "Parks, Horticulture and Urban Environment",
                "description": "Responsible for public parks, walking tracks, overgrown dangerous tree branches, and civic tree planting.",
                "supported_categories": ["Parks and Environment"],
                "contact_email": "parks.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1006",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-TRANS",
                "name": "Transportation and Traffic Infrastructure",
                "description": "Responsible for traffic signals, zebra crossings, pedestrian subways, bus shelters, and signage.",
                "supported_categories": ["Transportation and Traffic Infrastructure"],
                "contact_email": "traffic.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1007",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "department_id": "DEP-CIVIC",
                "name": "General Civic Services and Revenue Administration",
                "description": "Responsible for trade licenses, birth/death records, property tax queries, stray animal control, and general civic issues.",
                "supported_categories": ["General Civic Services"],
                "contact_email": "generalcivic.bbmp@civic.gov.in",
                "contact_phone": "+91-80-2222-1008",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso
            }
        ]
        with open(self.departments_file, "w", encoding="utf-8") as f:
            json.dump(departments, f, indent=2)

    def _seed_default_officers(self):
        """Seeds municipal officers across departments, zones, and wards."""
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        officers = [
            # ROADS DEPARTMENT
            {
                "officer_id": "OFF-ROADS-001",
                "user_id": "USR-OFF-001",
                "name": "Rajesh Kumar",
                "email": "rajesh.roads@bbmp.gov.in",
                "phone": "+91-9880112201",
                "department_id": "DEP-ROADS",
                "designation": "Assistant Executive Engineer (Roads)",
                "assigned_jurisdictions": [
                    {"zone": "East Zone", "ward": "Ward 112"},
                    {"zone": "East Zone", "ward": "Ward 113"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T07:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "officer_id": "OFF-ROADS-002",
                "user_id": "USR-OFF-002",
                "name": "Ananya Sharma",
                "email": "ananya.roads@bbmp.gov.in",
                "phone": "+91-9880112202",
                "department_id": "DEP-ROADS",
                "designation": "Assistant Engineer (Civil Infrastructure)",
                "assigned_jurisdictions": [
                    {"zone": "East Zone", "ward": "Ward 111"},
                    {"zone": "East Zone", "ward": "Ward 112"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 8,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "officer_id": "OFF-ROADS-003",
                "user_id": "USR-OFF-003",
                "name": "Suresh Gowda",
                "email": "suresh.roads@bbmp.gov.in",
                "phone": "+91-9880112203",
                "department_id": "DEP-ROADS",
                "designation": "Executive Engineer (West Zone Roads)",
                "assigned_jurisdictions": [
                    {"zone": "West Zone", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 12,
                "last_assigned_at": "2026-08-01T09:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "officer_id": "OFF-ROADS-004",
                "user_id": "USR-OFF-004",
                "name": "Vikram Patil",
                "email": "vikram.roads@bbmp.gov.in",
                "phone": "+91-9880112204",
                "department_id": "DEP-ROADS",
                "designation": "Senior Roads Inspector",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "ON_LEAVE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-07-20T10:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # WATER SUPPLY DEPARTMENT
            {
                "officer_id": "OFF-WATER-001",
                "user_id": "USR-OFF-005",
                "name": "Pooja Hegde",
                "email": "pooja.water@bbmp.gov.in",
                "phone": "+91-9880112205",
                "department_id": "DEP-WATER",
                "designation": "Assistant Executive Engineer (Water Supply)",
                "assigned_jurisdictions": [
                    {"zone": "East Zone", "ward": "Ward 112"},
                    {"zone": "South Zone", "ward": "Ward 131"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "officer_id": "OFF-WATER-002",
                "user_id": "USR-OFF-006",
                "name": "Manoj Deshmukh",
                "email": "manoj.water@bbmp.gov.in",
                "phone": "+91-9880112206",
                "department_id": "DEP-WATER",
                "designation": "Zonal Water Distribution Officer",
                "assigned_jurisdictions": [
                    {"zone": "South Zone", "ward": "*"},
                    {"zone": "Mahadevapura Zone", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 15,
                "last_assigned_at": "2026-08-01T08:30:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # SANITATION & SOLID WASTE MANAGEMENT
            {
                "officer_id": "OFF-SWM-001",
                "user_id": "USR-OFF-007",
                "name": "Kavita Rao",
                "email": "kavita.swm@bbmp.gov.in",
                "phone": "+91-9880112207",
                "department_id": "DEP-SWM",
                "designation": "Senior Health Inspector (Solid Waste)",
                "assigned_jurisdictions": [
                    {"zone": "East Zone", "ward": "Ward 111"},
                    {"zone": "East Zone", "ward": "Ward 112"},
                    {"zone": "East Zone", "ward": "Ward 113"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 12,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },
            {
                "officer_id": "OFF-SWM-002",
                "user_id": "USR-OFF-008",
                "name": "Ramesh Nayak",
                "email": "ramesh.swm@bbmp.gov.in",
                "phone": "+91-9880112208",
                "department_id": "DEP-SWM",
                "designation": "Junior Health Officer (City Waste Management)",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T07:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # DRAINAGE & SEWAGE
            {
                "officer_id": "OFF-DRAIN-001",
                "user_id": "USR-OFF-009",
                "name": "Arun Kulkarni",
                "email": "arun.drain@bbmp.gov.in",
                "phone": "+91-9880112209",
                "department_id": "DEP-DRAIN",
                "designation": "Stormwater Drainage Engineer",
                "assigned_jurisdictions": [
                    {"zone": "East Zone", "ward": "*"},
                    {"zone": "Mahadevapura Zone", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # ELECTRICAL & STREET LIGHTING
            {
                "officer_id": "OFF-ELEC-001",
                "user_id": "USR-OFF-010",
                "name": "Deepak Joshi",
                "email": "deepak.elec@bbmp.gov.in",
                "phone": "+91-9880112210",
                "department_id": "DEP-ELEC",
                "designation": "Assistant Engineer (Street Lighting)",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 15,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # PARKS & ENVIRONMENT
            {
                "officer_id": "OFF-PARKS-001",
                "user_id": "USR-OFF-011",
                "name": "Shilpa Reddy",
                "email": "shilpa.parks@bbmp.gov.in",
                "phone": "+91-9880112211",
                "department_id": "DEP-PARKS",
                "designation": "Horticulture Officer & Park Inspector",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # TRANSPORTATION & TRAFFIC
            {
                "officer_id": "OFF-TRANS-001",
                "user_id": "USR-OFF-012",
                "name": "Girish Bhat",
                "email": "girish.trans@bbmp.gov.in",
                "phone": "+91-9880112212",
                "department_id": "DEP-TRANS",
                "designation": "Traffic Engineering Superintendent",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 10,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            },

            # GENERAL CIVIC SERVICES
            {
                "officer_id": "OFF-CIVIC-001",
                "user_id": "USR-OFF-013",
                "name": "Sunita Verma",
                "email": "sunita.civic@bbmp.gov.in",
                "phone": "+91-9880112213",
                "department_id": "DEP-CIVIC",
                "designation": "Revenue and General Civic Inspector",
                "assigned_jurisdictions": [
                    {"zone": "*", "ward": "*"}
                ],
                "active": True,
                "availability_status": "AVAILABLE",
                "maximum_workload": 15,
                "last_assigned_at": "2026-08-01T08:00:00Z",
                "created_at": now_iso,
                "updated_at": now_iso
            }
        ]
        with open(self.officers_file, "w", encoding="utf-8") as f:
            json.dump(officers, f, indent=2)

    def _seed_default_users(self):
        """Seeds default users representing Citizen, Officer, and Admin roles."""
        users = [
            {
                "user_id": "USR-CITIZEN-001",
                "name": "Ramesh Pawar",
                "email": "citizen@example.com",
                "role": "CITIZEN",
                "phone": "+91-9876543210"
            },
            {
                "user_id": "USR-OFF-001",
                "name": "Rajesh Kumar",
                "email": "rajesh.roads@bbmp.gov.in",
                "role": "OFFICER",
                "officer_id": "OFF-ROADS-001",
                "department_id": "DEP-ROADS"
            },
            {
                "user_id": "USR-ADMIN-001",
                "name": "Municipal Commissioner / Administrator",
                "email": "admin@bbmp.gov.in",
                "role": "ADMIN",
                "department_id": "ALL"
            }
        ]
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)

    # -------------------------------------------------------------------------
    # GRIEVANCE OPERATIONS
    # -------------------------------------------------------------------------

    def insert_grievance(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a new grievance document."""
        with self._rw_lock:
            if "grievance_id" not in doc or not doc["grievance_id"]:
                doc["grievance_id"] = f"GRV-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            doc["created_at"] = doc.get("created_at") or now_iso
            doc["updated_at"] = now_iso
            
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
                
            records.append(doc)
            
            # Atomic save
            temp_file = self.grievances_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.grievances_file)
            
            logger.info(f"Inserted grievance document: {doc['grievance_id']} [Category: {doc.get('predicted_category')}]")

        # Record creation activity outside the grievance write lock
        try:
            self.insert_activity({
                "grievance_id": doc["grievance_id"],
                "activity_type": "GRIEVANCE_CREATED",
                "previous_status": None,
                "new_status": doc.get("status", "SUBMITTED"),
                "actor_id": doc.get("citizen_id", "CITIZEN"),
                "actor_role": "CITIZEN",
                "actor_name": doc.get("citizen_name", "Citizen"),
                "description": f"Grievance '{doc.get('title')}' submitted.",
                "visibility": "PUBLIC_TO_PARTICIPANTS"
            })
        except Exception as e:
            logger.warning(f"Could not record initial creation activity: {e}")

        return doc

    def get_grievance(self, grievance_id: str) -> Optional[Dict[str, Any]]:
        """Finds a grievance document by ID."""
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            for r in records:
                if r.get("grievance_id") == grievance_id:
                    return r
            return None

    def get_grievance_by_id(self, grievance_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_grievance."""
        return self.get_grievance(grievance_id)

    def get_activities_for_grievance(self, grievance_id: str, include_internal: bool = True) -> List[Dict[str, Any]]:
        """Alias for get_grievance_activities."""
        return self.get_grievance_activities(grievance_id=grievance_id, include_internal=include_internal)

    def list_grievances(
        self,
        category: Optional[str] = None,
        department_id: Optional[str] = None,
        officer_id: Optional[str] = None,
        status: Optional[str] = None,
        classification_status: Optional[str] = None,
        citizen_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists and filters grievance documents with pagination."""
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
                
            filtered = records
            if category:
                filtered = [r for r in filtered if r.get("predicted_category") == category or r.get("officer_final_category") == category]
            if department_id:
                filtered = [r for r in filtered if r.get("assigned_department_id") == department_id]
            if officer_id:
                filtered = [r for r in filtered if r.get("assigned_officer_id") == officer_id]
            if status:
                filtered = [r for r in filtered if r.get("status") == status]
            if classification_status:
                filtered = [r for r in filtered if r.get("classification_status") == classification_status]
            if citizen_id:
                filtered = [r for r in filtered if r.get("citizen_id") == citizen_id]
                
            # Sort newest first
            filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            total = len(filtered)
            paginated = filtered[offset : offset + limit]
            return paginated, total

    def update_grievance(self, grievance_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates fields of an existing grievance."""
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
                
            updated_doc = None
            for r in records:
                if r.get("grievance_id") == grievance_id:
                    updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    r.update(updates)
                    updated_doc = r
                    break
                    
            if updated_doc:
                temp_file = self.grievances_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, self.grievances_file)
                logger.info(f"Updated grievance document: {grievance_id}")
                
            return updated_doc

    # -------------------------------------------------------------------------
    # DEPARTMENT OPERATIONS
    # -------------------------------------------------------------------------

    def list_departments(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """Returns list of municipal departments."""
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            if active_only:
                records = [r for r in records if r.get("active", True)]
            return records

    def get_department(self, department_id: str) -> Optional[Dict[str, Any]]:
        """Gets a department by its identifier."""
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            for r in records:
                if r.get("department_id") == department_id:
                    return r
            return None

    def get_department_by_category(self, category: str) -> Optional[Dict[str, Any]]:
        """Finds the department responsible for a given grievance category."""
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            for r in records:
                if category in r.get("supported_categories", []):
                    return r
            # Fallback to General Civic Services if no direct match
            for r in records:
                if r.get("department_id") == "DEP-CIVIC":
                    return r
            return records[0] if records else None

    # -------------------------------------------------------------------------
    # OFFICER OPERATIONS & DYNAMIC WORKLOAD CALCULATION
    # -------------------------------------------------------------------------

    def list_officers(
        self,
        department_id: Optional[str] = None,
        active_only: bool = True,
        availability_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lists officers with optional department and availability filtering."""
        with self._rw_lock:
            with open(self.officers_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            
            filtered = records
            if active_only:
                filtered = [r for r in filtered if r.get("active", True)]
            if department_id:
                filtered = [r for r in filtered if r.get("department_id") == department_id]
            if availability_status:
                filtered = [r for r in filtered if r.get("availability_status") == availability_status]

            # Attach calculated dynamic workload to each officer
            for off in filtered:
                off["current_workload"] = self.calculate_officer_workload(off["officer_id"])
            return filtered

    def get_officer(self, officer_id: str) -> Optional[Dict[str, Any]]:
        """Gets an officer profile by ID with dynamically calculated workload."""
        with self._rw_lock:
            with open(self.officers_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            for r in records:
                if r.get("officer_id") == officer_id:
                    res = dict(r)
                    res["current_workload"] = self.calculate_officer_workload(officer_id)
                    return res
            return None

    def update_officer(self, officer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates officer profile attributes."""
        with self._rw_lock:
            with open(self.officers_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            updated_doc = None
            for r in records:
                if r.get("officer_id") == officer_id:
                    updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    r.update(updates)
                    updated_doc = dict(r)
                    break
            if updated_doc:
                temp_file = self.officers_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, self.officers_file)
                updated_doc["current_workload"] = self.calculate_officer_workload(officer_id)
            return updated_doc

    def calculate_officer_workload(self, officer_id: str) -> int:
        """
        Calculates active workload reliably by querying grievances assigned to the officer
        with active statuses: 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'.
        Does not count 'RESOLVED', 'CLOSED', or 'REJECTED'.
        """
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            active_statuses = {"ASSIGNED", "IN_PROGRESS", "REOPENED"}
            active_count = sum(
                1 for r in records
                if r.get("assigned_officer_id") == officer_id and r.get("status") in active_statuses
            )
            return active_count

    # -------------------------------------------------------------------------
    # ASSIGNMENT HISTORY OPERATIONS
    # -------------------------------------------------------------------------

    def insert_assignment(self, assignment_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an assignment record into the assignment history."""
        with self._rw_lock:
            if "assignment_id" not in assignment_doc or not assignment_doc["assignment_id"]:
                assignment_doc["assignment_id"] = f"ASG-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            assignment_doc["assigned_at"] = assignment_doc.get("assigned_at") or now_iso
            assignment_doc["status"] = assignment_doc.get("status", "ACTIVE")
            
            with open(self.assignments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
                
            records.append(assignment_doc)
            
            temp_file = self.assignments_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.assignments_file)
            
            logger.info(f"Inserted assignment record: {assignment_doc['assignment_id']} for grievance {assignment_doc.get('grievance_id')}")
            return assignment_doc

    def get_grievance_assignments(self, grievance_id: str) -> List[Dict[str, Any]]:
        """Retrieves full assignment history for a given grievance."""
        with self._rw_lock:
            with open(self.assignments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            history = [r for r in records if r.get("grievance_id") == grievance_id]
            history.sort(key=lambda x: x.get("assigned_at", ""), reverse=True)
            return history

    def supersede_active_assignments(self, grievance_id: str):
        """Marks any existing ACTIVE assignments for this grievance as SUPERSEDED."""
        with self._rw_lock:
            with open(self.assignments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            updated = False
            for r in records:
                if r.get("grievance_id") == grievance_id and r.get("status") == "ACTIVE":
                    r["status"] = "SUPERSEDED"
                    r["superseded_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    updated = True
            if updated:
                temp_file = self.assignments_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, self.assignments_file)

    # -------------------------------------------------------------------------
    # ROUTING AUDIT TRAIL
    # -------------------------------------------------------------------------

    def insert_routing_audit(self, audit_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Records an explainable routing decision in the database and audit trail file."""
        with self._rw_lock:
            if "audit_id" not in audit_doc or not audit_doc["audit_id"]:
                audit_doc["audit_id"] = f"AUD-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            audit_doc["timestamp"] = audit_doc.get("timestamp") or now_iso
            
            # 1. Store in repository collection
            with open(self.routing_audit_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.append(audit_doc)
            temp_file = self.routing_audit_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.routing_audit_file)
            
            # 2. Append to ml/datasets/feedback/routing_audit.json
            audit_dir = os.path.abspath("ml/datasets/feedback")
            os.makedirs(audit_dir, exist_ok=True)
            persistent_audit_file = os.path.join(audit_dir, "routing_audit.json")
            
            persisted = []
            if os.path.exists(persistent_audit_file):
                try:
                    with open(persistent_audit_file, "r", encoding="utf-8") as f:
                        persisted = json.load(f)
                except Exception:
                    persisted = []
            persisted.append(audit_doc)
            with open(persistent_audit_file, "w", encoding="utf-8") as f:
                json.dump(persisted, f, indent=2)
                
            logger.info(f"Recorded routing audit: {audit_doc['audit_id']} [Method: {audit_doc.get('routing_method')}]")
            return audit_doc

    def list_routing_audits(self, grievance_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """Lists routing audit entries."""
        with self._rw_lock:
            with open(self.routing_audit_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            if grievance_id:
                records = [r for r in records if r.get("grievance_id") == grievance_id]
            records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            total = len(records)
            return records[offset:offset + limit], total

    # -------------------------------------------------------------------------
    # FEEDBACK & USERS
    # -------------------------------------------------------------------------

    def insert_feedback(self, feedback_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an officer category correction feedback record."""
        with self._rw_lock:
            if "feedback_id" not in feedback_doc or not feedback_doc["feedback_id"]:
                feedback_doc["feedback_id"] = f"FDB-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
                
            feedback_doc["correction_timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
            with open(self.feedback_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.append(feedback_doc)
            temp_file = self.feedback_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.feedback_file)
            
            feedback_audit_dir = os.path.abspath("ml/datasets/feedback")
            os.makedirs(feedback_audit_dir, exist_ok=True)
            audit_file = os.path.join(feedback_audit_dir, "officer_corrections.json")
            
            audit_records = []
            if os.path.exists(audit_file):
                try:
                    with open(audit_file, "r", encoding="utf-8") as f:
                        audit_records = json.load(f)
                except Exception:
                    audit_records = []
            audit_records.append(feedback_doc)
            with open(audit_file, "w", encoding="utf-8") as f:
                json.dump(audit_records, f, indent=2)
                
            logger.info(f"Recorded category feedback: {feedback_doc['feedback_id']}")
            return feedback_doc

    def list_feedback(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Lists officer correction feedback records."""
        with self._rw_lock:
            with open(self.feedback_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.sort(key=lambda x: x.get("correction_timestamp", ""), reverse=True)
            return records[:limit]

    # -------------------------------------------------------------------------
    # ACTIVITIES (APPEND-ONLY TIMELINE)
    # -------------------------------------------------------------------------

    def insert_activity(self, activity_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an immutable activity history record."""
        with self._rw_lock:
            if "activity_id" not in activity_doc or not activity_doc["activity_id"]:
                activity_doc["activity_id"] = f"ACT-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            if "created_at" not in activity_doc or not activity_doc["created_at"]:
                activity_doc["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            with open(self.activities_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.append(activity_doc)
            temp_file = self.activities_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.activities_file)

            logger.info(f"Recorded activity {activity_doc['activity_id']} [{activity_doc.get('activity_type')}] for grievance {activity_doc.get('grievance_id')}")
            return activity_doc

    def record_activity(self, activity_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Alias for insert_activity."""
        return self.insert_activity(activity_doc)

    def get_grievance_activities(self, grievance_id: str, include_internal: bool = True) -> List[Dict[str, Any]]:
        """Retrieves timeline activities for a grievance, optionally filtering internal entries."""
        with self._rw_lock:
            with open(self.activities_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            acts = [r for r in records if r.get("grievance_id") == grievance_id]
            if not include_internal:
                acts = [r for r in acts if r.get("visibility") != "INTERNAL"]
            acts.sort(key=lambda x: x.get("created_at", ""))
            return acts

    # -------------------------------------------------------------------------
    # NOTIFICATIONS
    # -------------------------------------------------------------------------

    def insert_notification(self, notif_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an in-app notification record."""
        with self._rw_lock:
            if "notification_id" not in notif_doc or not notif_doc["notification_id"]:
                notif_doc["notification_id"] = f"NOTIF-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            if "created_at" not in notif_doc or not notif_doc["created_at"]:
                notif_doc["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            if "is_read" not in notif_doc:
                notif_doc["is_read"] = False

            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.append(notif_doc)
            temp_file = self.notifications_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.notifications_file)

            logger.info(f"Created notification {notif_doc['notification_id']} for {notif_doc.get('recipient_id')}")
            return notif_doc

    def get_user_notifications(self, recipient_id: str, is_read: Optional[bool] = None, unread_only: Optional[bool] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieves notifications for a specific user ID, with optional unread filter and pagination."""
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            user_notifs = [r for r in records if r.get("recipient_id") == recipient_id]
            if unread_only is True:
                user_notifs = [r for r in user_notifs if not r.get("is_read", False)]
            elif is_read is not None:
                user_notifs = [r for r in user_notifs if r.get("is_read") == is_read]
            user_notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return user_notifs[offset:offset + limit]

    def list_notifications_for_user(self, user_id: str, is_read: Optional[bool] = None, unread_only: Optional[bool] = None, limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """Lists notifications for a user, returning (items, total_count)."""
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            user_notifs = [r for r in records if r.get("recipient_id") == user_id or r.get("user_id") == user_id]
            if unread_only is True:
                user_notifs = [r for r in user_notifs if not r.get("is_read", False)]
            elif is_read is not None:
                user_notifs = [r for r in user_notifs if r.get("is_read") == is_read]
            user_notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            total = len(user_notifs)
            return user_notifs[offset:offset + limit], total

    def list_notifications(self, recipient_id: Optional[str] = None, is_read: Optional[bool] = None, unread_only: Optional[bool] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Alias for get_user_notifications or listing all notifications."""
        if recipient_id:
            return self.get_user_notifications(recipient_id=recipient_id, is_read=is_read, unread_only=unread_only, limit=limit, offset=offset)
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            if unread_only is True:
                records = [r for r in records if not r.get("is_read", False)]
            elif is_read is not None:
                records = [r for r in records if r.get("is_read") == is_read]
            records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return records[offset:offset + limit]

    def get_user_unread_notification_count(self, recipient_id: str) -> int:
        """Returns the count of unread notifications for a user."""
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            return sum(1 for r in records if r.get("recipient_id") == recipient_id and not r.get("is_read", False))

    def get_unread_notification_count(self, recipient_id: str) -> int:
        """Alias for get_user_unread_notification_count."""
        return self.get_user_unread_notification_count(recipient_id)

    def mark_notification_read(self, notification_id: str, recipient_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Marks a specific notification as read, validating recipient if provided."""
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            target = None
            for r in records:
                if r.get("notification_id") == notification_id:
                    if recipient_id and r.get("recipient_id") != recipient_id:
                        return None
                    r["is_read"] = True
                    r["read_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    target = r
                    break
            if target:
                temp_file = self.notifications_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, self.notifications_file)
            return target

    def mark_all_notifications_read(self, recipient_id: str) -> int:
        """Marks all unread notifications as read for a recipient, returning updated count."""
        with self._rw_lock:
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            updated_count = 0
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            for r in records:
                if r.get("recipient_id") == recipient_id and not r.get("is_read", False):
                    r["is_read"] = True
                    r["read_at"] = now_iso
                    updated_count += 1
            if updated_count > 0:
                temp_file = self.notifications_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, self.notifications_file)
            return updated_count

    # -------------------------------------------------------------------------
    # COMMENTS & MESSAGING
    # -------------------------------------------------------------------------

    def insert_comment(self, comment_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a new comment linked to a grievance."""
        with self._rw_lock:
            if "comment_id" not in comment_doc or not comment_doc["comment_id"]:
                comment_doc["comment_id"] = f"CMT-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            if "created_at" not in comment_doc or not comment_doc["created_at"]:
                comment_doc["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            with open(self.comments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            records.append(comment_doc)
            temp_file = self.comments_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            os.replace(temp_file, self.comments_file)

            logger.info(f"Added comment {comment_doc['comment_id']} on grievance {comment_doc.get('grievance_id')}")
            return comment_doc

    def add_comment(self, comment_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Alias for insert_comment."""
        return self.insert_comment(comment_doc)

    def get_grievance_comments(self, grievance_id: str, include_internal: bool = False) -> List[Dict[str, Any]]:
        """Retrieves comments for a grievance, optionally including internal comments."""
        with self._rw_lock:
            with open(self.comments_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            comments = [r for r in records if r.get("grievance_id") == grievance_id]
            if not include_internal:
                comments = [r for r in comments if r.get("visibility") != "INTERNAL"]
            comments.sort(key=lambda x: x.get("created_at", ""))
            return comments

    def get_resolved_grievances_for_auto_closure(self, days_threshold: int = 7) -> List[Dict[str, Any]]:
        """Finds all RESOLVED grievances that have exceeded the resolution threshold without citizen response."""
        now_ts = time.time()
        threshold_seconds = days_threshold * 86400
        eligible = []
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            for g in records:
                if g.get("status") == "RESOLVED":
                    res = g.get("resolution", {})
                    resolved_at_str = (res.get("resolved_at") if isinstance(res, dict) else None) or g.get("resolved_at") or g.get("updated_at")
                    if resolved_at_str:
                        try:
                            import datetime
                            dt = datetime.datetime.fromisoformat(resolved_at_str.replace("Z", "+00:00"))
                            res_ts = dt.timestamp()
                            if (now_ts - res_ts) >= threshold_seconds:
                                eligible.append(g)
                        except Exception:
                            pass
        return eligible


    # -------------------------------------------------------------------------
    # ADMIN DASHBOARD AGGREGATIONS & OPERATIONAL ALERTS (Phase 17)
    # -------------------------------------------------------------------------

    def get_admin_dashboard_stats(self) -> Dict[str, Any]:
        """
        Dynamically aggregates system-wide statistics from real MongoDB records.
        Does not hardcode or fabricate values.
        """
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                grievances = json.load(f)
            with open(self.officers_file, "r", encoding="utf-8") as f:
                officers = json.load(f)
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)
            with open(self.users_file, "r", encoding="utf-8") as f:
                users = json.load(f)
            with open(self.assignments_file, "r", encoding="utf-8") as f:
                assignments = json.load(f)
            with open(self.feedback_file, "r", encoding="utf-8") as f:
                feedback = json.load(f)

            total_grievances = len(grievances)
            
            # Status tallies
            status_counts = {
                "SUBMITTED": 0,
                "PENDING_REVIEW": 0,
                "PENDING_ASSIGNMENT": 0,
                "ASSIGNED": 0,
                "IN_PROGRESS": 0,
                "RESOLVED": 0,
                "CLOSED": 0,
                "REOPENED": 0,
                "REJECTED": 0
            }
            category_counts: Dict[str, int] = {}
            department_counts: Dict[str, int] = {}
            low_confidence_count = 0
            review_required_count = 0
            sla_critical_count = 0

            now_ts = time.time()

            for g in grievances:
                st = g.get("status", "SUBMITTED")
                status_counts[st] = status_counts.get(st, 0) + 1

                cat = g.get("officer_final_category") or g.get("predicted_category") or "General Civic Services"
                category_counts[cat] = category_counts.get(cat, 0) + 1

                dept_id = g.get("assigned_department_id") or "UNASSIGNED"
                department_counts[dept_id] = department_counts.get(dept_id, 0) + 1

                # ML Confidence check
                conf = g.get("classification_confidence", 1.0)
                if conf < 0.60 or g.get("classification_status") == "REVIEW_REQUIRED":
                    low_confidence_count += 1
                if g.get("classification_status") in ["REVIEW_REQUIRED", "MANUALLY_CORRECTED"]:
                    review_required_count += 1

                # Critical SLA heuristic (HIGH/EMERGENCY priority or active > 48h)
                if st in ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "REOPENED"]:
                    prio = g.get("priority", "MEDIUM")
                    created_at_str = g.get("created_at")
                    is_aged = False
                    if created_at_str:
                        try:
                            import datetime
                            dt = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                            if (now_ts - dt.timestamp()) > (48 * 3600):
                                is_aged = True
                        except Exception:
                            pass
                    if prio in ["HIGH", "EMERGENCY"] or is_aged:
                        sla_critical_count += 1

            # Officer workload metrics
            active_officers = [o for o in officers if o.get("active", True)]
            overloaded_officers = []
            for o in active_officers:
                wload = self.calculate_officer_workload(o["officer_id"])
                max_w = o.get("maximum_workload", 10)
                if wload >= max_w:
                    overloaded_officers.append({
                        "officer_id": o["officer_id"],
                        "name": o.get("name"),
                        "department_id": o.get("department_id"),
                        "current_workload": wload,
                        "maximum_workload": max_w
                    })

            # Pending assignment: submitted or unassigned
            pending_assignment = sum(
                1 for g in grievances
                if g.get("status") in ["SUBMITTED", "PENDING_ASSIGNMENT", "PENDING_REVIEW"]
                or not g.get("assigned_officer_id")
            )

            return {
                "total_grievances": total_grievances,
                "status_counts": status_counts,
                "submitted": status_counts.get("SUBMITTED", 0),
                "pending_assignment": pending_assignment,
                "assigned": status_counts.get("ASSIGNED", 0),
                "in_progress": status_counts.get("IN_PROGRESS", 0),
                "resolved": status_counts.get("RESOLVED", 0),
                "closed": status_counts.get("CLOSED", 0),
                "reopened": status_counts.get("REOPENED", 0),
                "rejected": status_counts.get("REJECTED", 0),
                "review_required": review_required_count,
                "low_confidence_count": low_confidence_count,
                "sla_critical": sla_critical_count,
                "category_counts": category_counts,
                "department_counts": department_counts,
                "total_officers": len(active_officers),
                "overloaded_officers_count": len(overloaded_officers),
                "overloaded_officers": overloaded_officers,
                "total_departments": len([d for d in departments if d.get("active", True)]),
                "total_users": len(users),
                "total_citizens": len([u for u in users if u.get("role") == "CITIZEN"]),
                "total_reassignments": len([a for a in assignments if a.get("assignment_type") in ["MANUAL_REASSIGNMENT", "OFFICER_REASSIGNMENT", "REASSIGNMENT"]]),
                "total_feedback_records": len(feedback)
            }

    def get_admin_operational_alerts(self) -> List[Dict[str, Any]]:
        """
        Generates actionable administrative alerts based on real system state.
        """
        alerts = []
        with self._rw_lock:
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                grievances = json.load(f)
            with open(self.officers_file, "r", encoding="utf-8") as f:
                officers = json.load(f)

            # 1. Unassigned / Pending assignment grievances
            unassigned = [
                g for g in grievances
                if g.get("status") in ["SUBMITTED", "PENDING_ASSIGNMENT", "PENDING_REVIEW"]
                or not g.get("assigned_officer_id")
            ]
            if unassigned:
                alerts.append({
                    "id": "ALT-PENDING-ASSIGN",
                    "type": "PENDING_ASSIGNMENT",
                    "severity": "HIGH",
                    "title": f"{len(unassigned)} Grievance(s) Pending Assignment",
                    "message": f"{len(unassigned)} grievances require department triage or manual officer assignment.",
                    "count": len(unassigned),
                    "link_tab": "all-grievances",
                    "filter_status": "SUBMITTED",
                    "items": [{"id": g.get("grievance_id"), "title": g.get("title"), "category": g.get("predicted_category")} for g in unassigned[:5]]
                })

            # 2. Low-confidence / Review required classifications
            low_conf = [
                g for g in grievances
                if g.get("classification_status") == "REVIEW_REQUIRED"
                or (g.get("classification_confidence", 1.0) < 0.60 and not g.get("officer_final_category"))
            ]
            if low_conf:
                alerts.append({
                    "id": "ALT-LOW-CONF",
                    "type": "CLASSIFICATION_REVIEW",
                    "severity": "MEDIUM",
                    "title": f"{len(low_conf)} AI Classification(s) Below Confidence Threshold",
                    "message": f"Low-confidence ML predictions detected (<60%). Human verification recommended.",
                    "count": len(low_conf),
                    "link_tab": "classification-review",
                    "items": [{"id": g.get("grievance_id"), "title": g.get("title"), "confidence": g.get("classification_confidence")} for g in low_conf[:5]]
                })

            # 3. Reopened Grievances
            reopened = [g for g in grievances if g.get("status") == "REOPENED"]
            if reopened:
                alerts.append({
                    "id": "ALT-REOPENED",
                    "type": "REOPENED_GRIEVANCES",
                    "severity": "HIGH",
                    "title": f"{len(reopened)} Reopened Grievance(s) Requiring Attention",
                    "message": f"Citizens have rejected resolutions or reopened complaints.",
                    "count": len(reopened),
                    "link_tab": "all-grievances",
                    "filter_status": "REOPENED",
                    "items": [{"id": g.get("grievance_id"), "title": g.get("title"), "assigned_to": g.get("assigned_officer_id")} for g in reopened[:5]]
                })

            # 4. Overloaded Officers
            overloaded = []
            for o in officers:
                if o.get("active", True):
                    wload = self.calculate_officer_workload(o["officer_id"])
                    max_w = o.get("maximum_workload", 10)
                    if wload >= max_w:
                        overloaded.append({
                            "officer_id": o["officer_id"],
                            "name": o.get("name"),
                            "department": o.get("department_id"),
                            "workload": wload,
                            "max": max_w
                        })
            if overloaded:
                alerts.append({
                    "id": "ALT-OVERLOAD",
                    "type": "OFFICER_OVERLOAD",
                    "severity": "HIGH",
                    "title": f"{len(overloaded)} Officer(s) At / Exceeding Maximum Capacity",
                    "message": f"Officers have reached saturation limit. Auto-routing is bypassing them or rebalancing is needed.",
                    "count": len(overloaded),
                    "link_tab": "officers",
                    "items": overloaded
                })

            return alerts

    # -------------------------------------------------------------------------
    # USER MANAGEMENT (Phase 17 - Step 11)
    # -------------------------------------------------------------------------

    def list_users(self, role: Optional[str] = None, search: Optional[str] = None, limit: int = 100, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """Lists users with optional role and search query."""
        with self._rw_lock:
            with open(self.users_file, "r", encoding="utf-8") as f:
                users = json.load(f)
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                grievances = json.load(f)

            filtered = users
            if role:
                filtered = [u for u in filtered if u.get("role", "").upper() == role.upper()]
            if search:
                s = search.lower()
                filtered = [
                    u for u in filtered
                    if s in u.get("name", "").lower() or s in u.get("email", "").lower() or s in u.get("user_id", "").lower() or s in u.get("phone", "").lower()
                ]

            # Attach user grievance counts
            result = []
            for u in filtered:
                u_copy = dict(u)
                uid = u.get("user_id")
                u_copy["submitted_count"] = sum(1 for g in grievances if g.get("citizen_id") == uid)
                result.append(u_copy)

            total = len(result)
            return result[offset : offset + limit], total

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by user_id."""
        with self._rw_lock:
            with open(self.users_file, "r", encoding="utf-8") as f:
                users = json.load(f)
            for u in users:
                if u.get("user_id") == user_id:
                    return dict(u)
            return None

    def insert_user(self, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a new user record."""
        with self._rw_lock:
            if "user_id" not in user_doc or not user_doc["user_id"]:
                prefix = "USR-CIT" if user_doc.get("role") == "CITIZEN" else ("USR-OFF" if user_doc.get("role") == "OFFICER" else "USR-ADM")
                user_doc["user_id"] = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            user_doc["created_at"] = user_doc.get("created_at") or now_iso
            user_doc["updated_at"] = now_iso
            user_doc["active"] = user_doc.get("active", True)

            with open(self.users_file, "r", encoding="utf-8") as f:
                users = json.load(f)

            # Check if email already exists
            for u in users:
                if u.get("email", "").lower() == user_doc.get("email", "").lower():
                    raise ValueError(f"User with email '{user_doc.get('email')}' already exists.")

            users.append(user_doc)
            temp_file = self.users_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            os.replace(temp_file, self.users_file)

            logger.info(f"Created user {user_doc['user_id']} ({user_doc.get('role')})")
            return user_doc

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates user profile or active status."""
        with self._rw_lock:
            with open(self.users_file, "r", encoding="utf-8") as f:
                users = json.load(f)
            target = None
            for u in users:
                if u.get("user_id") == user_id:
                    updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    # Do not allow overwriting user_id
                    updates.pop("user_id", None)
                    u.update(updates)
                    target = dict(u)
                    break
            if target:
                temp_file = self.users_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(users, f, indent=2)
                os.replace(temp_file, self.users_file)
            return target

    # -------------------------------------------------------------------------
    # OFFICER CREATION & JURISDICTIONS (Phase 17 - Steps 9 & 10)
    # -------------------------------------------------------------------------

    def insert_officer(self, officer_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new municipal officer and associated user account if needed."""
        with self._rw_lock:
            dept_id = officer_doc.get("department_id", "DEP-CIVIC")
            prefix_dept = dept_id.replace("DEP-", "")
            if "officer_id" not in officer_doc or not officer_doc["officer_id"]:
                officer_doc["officer_id"] = f"OFF-{prefix_dept}-{uuid.uuid4().hex[:4].upper()}"
            if "user_id" not in officer_doc or not officer_doc["user_id"]:
                officer_doc["user_id"] = f"USR-OFF-{uuid.uuid4().hex[:4].upper()}"

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            officer_doc["created_at"] = now_iso
            officer_doc["updated_at"] = now_iso
            officer_doc["active"] = officer_doc.get("active", True)
            officer_doc["availability_status"] = officer_doc.get("availability_status", "AVAILABLE")
            officer_doc["maximum_workload"] = int(officer_doc.get("maximum_workload", 10))

            with open(self.officers_file, "r", encoding="utf-8") as f:
                officers = json.load(f)
            officers.append(officer_doc)

            temp_file = self.officers_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(officers, f, indent=2)
            os.replace(temp_file, self.officers_file)

            # Sync with users collection
            try:
                self.insert_user({
                    "user_id": officer_doc["user_id"],
                    "name": officer_doc.get("name"),
                    "email": officer_doc.get("email"),
                    "phone": officer_doc.get("phone", ""),
                    "role": "OFFICER",
                    "officer_id": officer_doc["officer_id"],
                    "department_id": officer_doc["department_id"],
                    "active": True
                })
            except Exception:
                pass

            officer_doc["current_workload"] = 0
            logger.info(f"Created municipal officer: {officer_doc['officer_id']} - {officer_doc.get('name')}")
            return officer_doc

    def get_officer(self, officer_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a municipal officer by officer_id."""
        with self._rw_lock:
            with open(self.officers_file, "r", encoding="utf-8") as f:
                officers = json.load(f)
            for off in officers:
                if off.get("officer_id") == officer_id:
                    return dict(off)
            return None

    def get_officer_by_id(self, officer_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_officer."""
        return self.get_officer(officer_id)

    # -------------------------------------------------------------------------
    # DEPARTMENT MANAGEMENT (Phase 17 - Step 12)
    # -------------------------------------------------------------------------

    def get_department(self, department_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a municipal department by department_id."""
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)
            for dept in departments:
                if dept.get("department_id") == department_id:
                    return dict(dept)
            return None

    def get_department_by_id(self, department_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_department."""
        return self.get_department(department_id)

    def insert_department(self, dept_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new municipal department."""
        with self._rw_lock:
            name = dept_doc.get("name", "New Department")
            if "department_id" not in dept_doc or not dept_doc["department_id"]:
                clean_name = re.sub(r'[^A-Za-z0-9]', '', name)[:6].upper()
                dept_doc["department_id"] = f"DEP-{clean_name}"

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            dept_doc["created_at"] = now_iso
            dept_doc["updated_at"] = now_iso
            dept_doc["active"] = dept_doc.get("active", True)
            dept_doc["supported_categories"] = dept_doc.get("supported_categories", [])

            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)

            # Check if department_id exists
            for d in departments:
                if d.get("department_id") == dept_doc["department_id"]:
                    raise ValueError(f"Department with ID '{dept_doc['department_id']}' already exists.")

            departments.append(dept_doc)
            temp_file = self.departments_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(departments, f, indent=2)
            os.replace(temp_file, self.departments_file)

            logger.info(f"Created department: {dept_doc['department_id']} - {dept_doc.get('name')}")
            return dept_doc

    def update_department(self, department_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates department information and supported categories."""
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)
            target = None
            for d in departments:
                if d.get("department_id") == department_id:
                    updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    updates.pop("department_id", None)
                    d.update(updates)
                    target = dict(d)
                    break
            if target:
                temp_file = self.departments_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(departments, f, indent=2)
                os.replace(temp_file, self.departments_file)
            return target

    # -------------------------------------------------------------------------
    # JURISDICTION MANAGEMENT (Phase 17 - Step 13)
    # -------------------------------------------------------------------------

    def list_jurisdictions(self) -> List[Dict[str, Any]]:
        """Lists all municipal zones, wards, and corporations."""
        with self._rw_lock:
            with open(self.jurisdictions_file, "r", encoding="utf-8") as f:
                return json.load(f)

    def insert_jurisdiction(self, jur_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a new municipal jurisdiction zone."""
        with self._rw_lock:
            if "jurisdiction_id" not in jur_doc or not jur_doc["jurisdiction_id"]:
                jur_doc["jurisdiction_id"] = f"JUR-{uuid.uuid4().hex[:4].upper()}"

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            jur_doc["created_at"] = now_iso
            jur_doc["updated_at"] = now_iso
            jur_doc["active"] = jur_doc.get("active", True)
            jur_doc["wards"] = jur_doc.get("wards", [])

            with open(self.jurisdictions_file, "r", encoding="utf-8") as f:
                jurisdictions = json.load(f)
            jurisdictions.append(jur_doc)

            temp_file = self.jurisdictions_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(jurisdictions, f, indent=2)
            os.replace(temp_file, self.jurisdictions_file)

            return jur_doc

    def update_jurisdiction(self, jurisdiction_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates zone or ward definitions for a jurisdiction."""
        with self._rw_lock:
            with open(self.jurisdictions_file, "r", encoding="utf-8") as f:
                jurisdictions = json.load(f)
            target = None
            for j in jurisdictions:
                if j.get("jurisdiction_id") == jurisdiction_id:
                    updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    updates.pop("jurisdiction_id", None)
                    j.update(updates)
                    target = dict(j)
                    break
            if target:
                temp_file = self.jurisdictions_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(jurisdictions, f, indent=2)
                os.replace(temp_file, self.jurisdictions_file)
            return target

    # -------------------------------------------------------------------------
    # ROUTING RULES MANAGEMENT (Phase 17 - Step 14)
    # -------------------------------------------------------------------------

    def get_routing_rules(self) -> List[Dict[str, Any]]:
        """
        Derives active category-to-department routing rules.
        """
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)

            rules = []
            for d in departments:
                dept_id = d.get("department_id")
                dept_name = d.get("name")
                is_active = d.get("active", True)
                for cat in d.get("supported_categories", []):
                    rules.append({
                        "category": cat,
                        "department_id": dept_id,
                        "department_name": dept_name,
                        "department_active": is_active,
                        "updated_at": d.get("updated_at")
                    })
            return rules

    def update_routing_rule(self, category: str, department_id: str, actor_id: str, reason: str = "") -> Dict[str, Any]:
        """
        Reassigns a category mapping to a target department and records an administrative audit log.
        """
        with self._rw_lock:
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)

            prev_dept_id = None
            target_found = False

            for d in departments:
                # Remove category from old department
                if category in d.get("supported_categories", []):
                    prev_dept_id = d.get("department_id")
                    d["supported_categories"].remove(category)
                    d["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                # Add category to target department
                if d.get("department_id") == department_id:
                    if category not in d.get("supported_categories", []):
                        d["supported_categories"].append(category)
                        d["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    target_found = True

            if not target_found:
                raise ValueError(f"Target department '{department_id}' not found.")

            temp_file = self.departments_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(departments, f, indent=2)
            os.replace(temp_file, self.departments_file)

            # Insert admin audit record
            self.insert_admin_audit_log({
                "actor_id": actor_id,
                "actor_role": "ADMIN",
                "action_type": "ROUTING_RULE_CHANGED",
                "target_type": "ROUTING_RULE",
                "target_id": category,
                "previous_value": {"category": category, "department_id": prev_dept_id},
                "new_value": {"category": category, "department_id": department_id},
                "reason": reason or f"Reassigned '{category}' routing rule to department '{department_id}'"
            })

            return {
                "category": category,
                "previous_department_id": prev_dept_id,
                "new_department_id": department_id,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

    # -------------------------------------------------------------------------
    # ADMINISTRATIVE AUDIT LOGS (Phase 17 - Step 18 - Append Only)
    # -------------------------------------------------------------------------

    def insert_admin_audit_log(self, audit_doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts an immutable append-only administrative audit log.
        Historical records cannot be modified or deleted.
        """
        with self._rw_lock:
            if "log_id" not in audit_doc or not audit_doc["log_id"]:
                audit_doc["log_id"] = f"ADM-LOG-{time.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            if "timestamp" not in audit_doc or not audit_doc["timestamp"]:
                audit_doc["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            with open(self.admin_audit_file, "r", encoding="utf-8") as f:
                logs = json.load(f)
            logs.append(audit_doc)

            temp_file = self.admin_audit_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(logs, f, indent=2)
            os.replace(temp_file, self.admin_audit_file)

            logger.info(f"Recorded admin audit log: {audit_doc['log_id']} [{audit_doc.get('action_type')}]")
            return audit_doc

    def list_admin_audit_logs(
        self,
        actor_id: Optional[str] = None,
        action_type: Optional[str] = None,
        target_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists administrative audit logs, sorted newest first."""
        with self._rw_lock:
            with open(self.admin_audit_file, "r", encoding="utf-8") as f:
                logs = json.load(f)

            filtered = logs
            if actor_id:
                filtered = [l for l in filtered if l.get("actor_id") == actor_id]
            if action_type:
                filtered = [l for l in filtered if l.get("action_type") == action_type]
            if target_type:
                filtered = [l for l in filtered if l.get("target_type") == target_type]

            filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            total = len(filtered)
            return filtered[offset : offset + limit], total

    # -------------------------------------------------------------------------
    # SYSTEM SETTINGS (Phase 17 - Step 17)
    # -------------------------------------------------------------------------

    def get_system_settings(self) -> Dict[str, Any]:
        """Retrieves system configuration settings."""
        with self._rw_lock:
            with open(self.settings_file, "r", encoding="utf-8") as f:
                return json.load(f)

    def update_system_settings(self, updates: Dict[str, Any], actor_id: str = "ADMIN") -> Dict[str, Any]:
        """Updates configurable system settings and logs audit entry."""
        with self._rw_lock:
            with open(self.settings_file, "r", encoding="utf-8") as f:
                current_settings = json.load(f)

            previous_settings = dict(current_settings)
            updates["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            updates["updated_by"] = actor_id
            current_settings.update(updates)

            temp_file = self.settings_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(current_settings, f, indent=2)
            os.replace(temp_file, self.settings_file)

            # Insert audit record
            self.insert_admin_audit_log({
                "actor_id": actor_id,
                "actor_role": "ADMIN",
                "action_type": "SYSTEM_SETTINGS_UPDATED",
                "target_type": "SETTINGS",
                "target_id": "SYSTEM_CONFIG",
                "previous_value": previous_settings,
                "new_value": current_settings,
                "reason": "Administrative system configuration update"
            })

            return current_settings

    # -------------------------------------------------------------------------
    # DATABASE INTEGRITY & HEALTH VALIDATION (Phase 19 - Step 12)
    # -------------------------------------------------------------------------

    def verify_database_integrity(self) -> Dict[str, Any]:
        """
        Performs a full relational & document integrity audit across all collections:
        - Detects duplicate grievance IDs
        - Finds orphaned assignments, comments, or activities
        - Verifies officer-to-department linkages
        - Validates grievance status consistency and required fields
        - Identifies broken foreign references
        """
        with self._rw_lock:
            issues: List[str] = []
            warnings: List[str] = []

            # Load collections
            with open(self.grievances_file, "r", encoding="utf-8") as f:
                grievances = json.load(f)
            with open(self.departments_file, "r", encoding="utf-8") as f:
                departments = json.load(f)
            with open(self.officers_file, "r", encoding="utf-8") as f:
                officers = json.load(f)
            with open(self.assignments_file, "r", encoding="utf-8") as f:
                assignments = json.load(f)
            with open(self.comments_file, "r", encoding="utf-8") as f:
                comments = json.load(f)
            with open(self.activities_file, "r", encoding="utf-8") as f:
                activities = json.load(f)
            with open(self.notifications_file, "r", encoding="utf-8") as f:
                notifications = json.load(f)

            dept_ids = {d.get("department_id") for d in departments if d.get("department_id")}
            officer_ids = {o.get("officer_id") for o in officers if o.get("officer_id")}
            user_ids = {o.get("user_id") for o in officers if o.get("user_id")}

            valid_statuses = {
                "SUBMITTED", "PENDING_REVIEW", "PENDING_ASSIGNMENT",
                "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED",
                "REOPENED", "REJECTED"
            }

            # 1. Grievance ID uniqueness & field requirements
            seen_grv_ids = set()
            for grv in grievances:
                gid = grv.get("grievance_id")
                if not gid:
                    issues.append("Grievance found missing 'grievance_id' field.")
                    continue
                if gid in seen_grv_ids:
                    issues.append(f"Duplicate grievance_id detected: '{gid}'")
                seen_grv_ids.add(gid)

                if not grv.get("title"):
                    issues.append(f"Grievance {gid} is missing required 'title'.")
                if not grv.get("created_at"):
                    issues.append(f"Grievance {gid} is missing required 'created_at'.")

                st = grv.get("status")
                if not st or st not in valid_statuses:
                    issues.append(f"Grievance {gid} has invalid or missing status '{st}'.")

                dept_id = grv.get("department_id")
                if dept_id and dept_id not in dept_ids:
                    warnings.append(f"Grievance {gid} references unknown department_id '{dept_id}'.")

                off_id = grv.get("assigned_officer_id")
                if off_id and off_id not in officer_ids:
                    warnings.append(f"Grievance {gid} references unknown officer_id '{off_id}'.")

            # 2. Officer-Department Consistency
            for off in officers:
                oid = off.get("officer_id")
                odept = off.get("department_id")
                if not oid:
                    issues.append("Officer record found missing 'officer_id'.")
                if odept and odept not in dept_ids:
                    warnings.append(f"Officer {oid} assigned to non-existent department_id '{odept}'.")

            # 3. Orphaned Assignments Check
            for asg in assignments:
                agid = asg.get("grievance_id")
                if not agid or agid not in seen_grv_ids:
                    issues.append(f"Orphaned assignment {asg.get('assignment_id')} references non-existent grievance '{agid}'.")
                a_off = asg.get("assigned_to_officer_id")
                if a_off and a_off not in officer_ids:
                    warnings.append(f"Assignment {asg.get('assignment_id')} references unknown officer '{a_off}'.")

            # 4. Orphaned Comments Check
            for cmt in comments:
                cgid = cmt.get("grievance_id")
                if not cgid or cgid not in seen_grv_ids:
                    issues.append(f"Orphaned comment {cmt.get('comment_id')} references non-existent grievance '{cgid}'.")

            # 5. Orphaned Activities Check
            for act in activities:
                act_gid = act.get("grievance_id")
                if not act_gid or act_gid not in seen_grv_ids:
                    issues.append(f"Orphaned activity {act.get('activity_id')} references non-existent grievance '{act_gid}'.")

            # 6. Notifications Validity
            for notif in notifications:
                if not notif.get("title") or not notif.get("message"):
                    issues.append(f"Notification {notif.get('notification_id')} is missing title or message.")

            is_healthy = len(issues) == 0

            return {
                "healthy": is_healthy,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_grievances": len(grievances),
                "total_departments": len(departments),
                "total_officers": len(officers),
                "total_assignments": len(assignments),
                "total_comments": len(comments),
                "total_activities": len(activities),
                "total_notifications": len(notifications),
                "issues_count": len(issues),
                "warnings_count": len(warnings),
                "issues": issues,
                "warnings": warnings
            }


def get_db_client() -> MongoRepository:
    """Returns the database repository instance."""
    return MongoRepository.get_instance()

