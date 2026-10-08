export const INITIAL_USERS = [
  {
    id: 'usr_cit_01',
    fullName: 'Rajesh Patil',
    email: 'consumer.demo@gmail.com',
    role: 'CITIZEN',
    mobile: '+91 9881098765',
    city: 'Pune',
    consumerNumber: '270019284102',
    meterNumber: 'MTR-994812',
    avatarUrl: ''
  },
  {
    id: 'usr_off_01',
    fullName: 'Er. Sanjay Deshmukh',
    email: 'pune.officer@msedcl-grievance.in',
    role: 'OFFICER',
    designation: 'Junior Engineer (Power Operations)',
    departmentId: 'dept_power_supply',
    departmentCode: 'POWER_SUPPLY',
    mobile: '+91 9422019823',
    city: 'Pune Circle',
    avatarUrl: ''
  },
  {
    id: 'usr_off_02',
    fullName: 'Priya Kulkarni',
    email: 'metering.officer@msedcl-grievance.in',
    role: 'OFFICER',
    designation: 'Senior Technician (Metering)',
    departmentId: 'dept_metering',
    departmentCode: 'METERING',
    mobile: '+91 9890123456',
    city: 'Pune Circle',
    avatarUrl: ''
  },
  {
    id: 'usr_adm_01',
    fullName: 'System Administrator',
    email: 'admin@msedcl-grievance.in',
    role: 'ADMIN',
    designation: 'Discom System Administrator',
    mobile: '+91 9800011122',
    city: 'Maharashtra HQ',
    avatarUrl: ''
  }
];

export const INITIAL_DEPARTMENTS = [
  {
    id: 'dept_power_supply',
    name: 'Power Supply & Operations Department',
    nameHi: 'बिजली आपूर्ति एवं संचालन विभाग',
    nameMr: 'वीज पुरवठा व संचालन विभाग',
    code: 'POWER_SUPPLY',
    description: 'Handles 11kV/33kV feeder trips, sub-station operations, power supply restoration, and area outages.',
    headOfficerName: 'Er. Sanjay Deshmukh (Executive Engineer)',
    totalOfficers: 8,
    slaDays: 1,
    iconName: 'Zap',
    isActive: true
  },
  {
    id: 'dept_metering',
    name: 'Metering & Technical Service Unit',
    nameHi: 'मीटरिंग एवं तकनीकी सेवा इकाई',
    nameMr: 'मीटरिंग व तांत्रिक सेवा विभाग',
    code: 'METERING',
    description: 'Inspection, testing, error code diagnosis, smart meter replacement, and static meter calibration.',
    headOfficerName: 'Smt. Priya Kulkarni (Senior Meter Engineer)',
    totalOfficers: 5,
    slaDays: 2,
    iconName: 'Activity',
    isActive: true
  },
  {
    id: 'dept_billing',
    name: 'Billing & Customer Revenue Section',
    nameHi: 'बिलिंग एवं उपभोक्ता राजस्व अनुभाग',
    nameMr: 'बिलिंग व महसूल विभाग',
    code: 'BILLING',
    description: 'Resolution of bill discrepancies, tariff verification, meter reading audits, and payment updates.',
    headOfficerName: 'Shri Amit Joshi (Revenue Officer)',
    totalOfficers: 6,
    slaDays: 3,
    iconName: 'FileText',
    isActive: true
  },
  {
    id: 'dept_maintenance',
    name: 'Substation & Transformer Maintenance',
    nameHi: 'सबस्टेशन एवं ट्रांसफॉर्मर रखरखाव विभाग',
    nameMr: 'सबस्टेशन व ट्रान्सफॉर्मर देखभाल विभाग',
    code: 'MAINTENANCE',
    description: 'Distribution Transformer (DTR) maintenance, jumper repair, oil filtration, and feeder line maintenance.',
    headOfficerName: 'Er. Manoj Patil (Substation Engineer)',
    totalOfficers: 6,
    slaDays: 2,
    iconName: 'ShieldAlert',
    isActive: true
  },
  {
    id: 'dept_safety',
    name: 'Emergency Electrical Safety & Hazard Response',
    nameHi: 'आपत्कालीन विद्युत सुरक्षा एवं खतरा प्रतिक्रिया',
    nameMr: 'तातडीची वीज सुरक्षा व अपघात निवारण पथक',
    code: 'EMERGENCY_SAFETY',
    description: '24/7 Rapid Response for fallen electric poles, dangling live wires, sparking lines, and transformer fires.',
    headOfficerName: 'Er. Vijay Shinde (Safety Cell In-Charge)',
    totalOfficers: 4,
    slaDays: 1,
    iconName: 'AlertTriangle',
    isActive: true
  },
  {
    id: 'dept_commercial',
    name: 'New Connection & Commercial Cell',
    nameHi: 'नया कनेक्शन एवं वाणिज्यिक सेल',
    nameMr: 'नवीन जोडणी व व्यावसायिक विभाग',
    code: 'COMMERCIAL',
    description: 'Processing new electricity service connections, load enhancement, tariff change, and power theft inspection.',
    headOfficerName: 'Smt. Anjali Rao (Commercial Manager)',
    totalOfficers: 4,
    slaDays: 4,
    iconName: 'Building2',
    isActive: true
  }
];

export const INITIAL_CATEGORIES = [
  { id: 'cat_01', name: 'Power Outage / No Supply', code: 'Power Outage / No Supply', deptCode: 'POWER_SUPPLY', priority: 'HIGH', icon: 'Zap' },
  { id: 'cat_02', name: 'Voltage Fluctuation / Low Voltage', code: 'Voltage Fluctuation / Low Voltage', deptCode: 'POWER_SUPPLY', priority: 'MEDIUM', icon: 'Activity' },
  { id: 'cat_03', name: 'Meter Issues', code: 'Meter Issues', deptCode: 'METERING', priority: 'MEDIUM', icon: 'Cpu' },
  { id: 'cat_04', name: 'Billing and Payment', code: 'Billing and Payment', deptCode: 'BILLING', priority: 'LOW', icon: 'FileText' },
  { id: 'cat_05', name: 'Transformer Fault', code: 'Transformer Fault', deptCode: 'MAINTENANCE', priority: 'HIGH', icon: 'AlertCircle' },
  { id: 'cat_06', name: 'Pole / Wire / Electrical Hazard', code: 'Pole / Wire / Electrical Hazard', deptCode: 'EMERGENCY_SAFETY', priority: 'CRITICAL', icon: 'AlertTriangle' },
  { id: 'cat_07', name: 'New Connection / Service Request', code: 'New Connection / Service Request', deptCode: 'COMMERCIAL', priority: 'LOW', icon: 'Building2' },
  { id: 'cat_08', name: 'Street/Public Electrical Infrastructure', code: 'Street/Public Electrical Infrastructure', deptCode: 'MAINTENANCE', priority: 'LOW', icon: 'Sun' },
  { id: 'cat_09', name: 'Power Theft / Unauthorized Connection', code: 'Power Theft / Unauthorized Connection', deptCode: 'COMMERCIAL', priority: 'HIGH', icon: 'Lock' },
  { id: 'cat_10', name: 'General Consumer Services', code: 'General Consumer Services', deptCode: 'POWER_SUPPLY', priority: 'LOW', icon: 'HelpCircle' },
];

export const INITIAL_GRIEVANCES = [
  {
    id: 'grv_elec_001',
    grievanceId: 'MSED-2026-89412',
    title: 'Complete power loss in Shivajinagar Block 4 since 6:30 PM',
    description: 'Entire residential colony of 40 houses experiencing sudden power blackout after thunderstorm. Feeder line appears tripped.',
    providedCategory: 'Power Outage / No Supply',
    predictedCategory: 'Power Outage / No Supply',
    verifiedCategory: 'Power Outage / No Supply',
    priority: 'HIGH',
    prioritySource: 'ML',
    status: 'IN_PROGRESS',
    safetyRiskLevel: 'LOW',
    consumerId: 'usr_cit_01',
    consumerName: 'Rajesh Patil',
    consumerMobile: '+91 9881098765',
    consumerNumber: '270019284102',
    meterNumber: 'MTR-994812',
    assignedDepartmentId: 'dept_power_supply',
    assignedDepartmentCode: 'POWER_SUPPLY',
    assignedOfficerId: 'usr_off_01',
    assignedOfficerName: 'Er. Sanjay Deshmukh',
    assignedOfficerRole: 'Junior Engineer (Power Operations)',
    locationAddress: 'Shivajinagar Colony, Lane 4, Pune, Maharashtra 411005',
    substation: 'Shivajinagar 33kV Substation',
    circle: 'Pune Urban Circle',
    pincode: '411005',
    createdAt: '2026-09-09T18:30:00Z',
    dueAt: '2026-09-10T02:30:00Z',
    modelVersion: '1.0.0'
  },
  {
    id: 'grv_elec_002',
    grievanceId: 'MSED-2026-90125',
    title: 'Severe voltage fluctuation causing appliance tripping',
    description: 'Voltage dropping to 140V repeatedly in Sector 9. Air conditioners and refrigerators shutting down automatically.',
    providedCategory: 'Voltage Fluctuation / Low Voltage',
    predictedCategory: 'Voltage Fluctuation / Low Voltage',
    verifiedCategory: 'Voltage Fluctuation / Low Voltage',
    priority: 'MEDIUM',
    prioritySource: 'RULE_BASED',
    status: 'ASSIGNED',
    safetyRiskLevel: 'NONE',
    consumerId: 'usr_cit_01',
    consumerName: 'Rajesh Patil',
    consumerMobile: '+91 9881098765',
    consumerNumber: '270019284102',
    meterNumber: 'MTR-994812',
    assignedDepartmentId: 'dept_power_supply',
    assignedDepartmentCode: 'POWER_SUPPLY',
    assignedOfficerId: 'usr_off_01',
    assignedOfficerName: 'Er. Sanjay Deshmukh',
    assignedOfficerRole: 'Junior Engineer (Power Operations)',
    locationAddress: 'Sector 9, Plot 14, Kothrud, Pune 411038',
    substation: 'Kothrud Substation',
    circle: 'Pune Urban Circle',
    pincode: '411038',
    createdAt: '2026-09-09T15:15:00Z',
    dueAt: '2026-09-10T15:15:00Z',
    modelVersion: '1.0.0'
  },
  {
    id: 'grv_elec_003',
    grievanceId: 'MSED-2026-77341',
    title: 'Distribution Transformer T-4 sparking and heavy smoke near Market Gate',
    description: 'URGENT: Distribution transformer on pole #P-402 is sparking violently with loud bangs and visible smoke near public market entrance.',
    providedCategory: 'Pole / Wire / Electrical Hazard',
    predictedCategory: 'Pole / Wire / Electrical Hazard',
    verifiedCategory: 'Pole / Wire / Electrical Hazard',
    priority: 'CRITICAL',
    prioritySource: 'RULE_BASED',
    status: 'IN_PROGRESS',
    safetyRiskLevel: 'CRITICAL_HAZARD',
    consumerId: 'usr_cit_02',
    consumerName: 'Sunil Mehta',
    consumerMobile: '+91 9822012345',
    consumerNumber: '270088192033',
    meterNumber: 'MTR-402199',
    assignedDepartmentId: 'dept_safety',
    assignedDepartmentCode: 'EMERGENCY_SAFETY',
    assignedOfficerId: 'usr_off_01',
    assignedOfficerName: 'Er. Vijay Shinde',
    assignedOfficerRole: 'Safety Cell In-Charge',
    locationAddress: 'Main Market Gate, FC Road, Pune 411004',
    substation: 'FC Road Substation',
    circle: 'Pune Urban Circle',
    pincode: '411004',
    createdAt: '2026-09-09T19:00:00Z',
    dueAt: '2026-09-09T22:00:00Z',
    modelVersion: '1.0.0'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_001',
    title: 'Grievance Registered',
    message: 'Your complaint MSED-2026-89412 has been classified as "Power Outage / No Supply" and assigned to Power Supply Operations.',
    timestamp: '2026-09-09T18:31:00Z',
    read: false,
    grievanceId: 'grv_elec_001'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'aud_001',
    action: 'GRIEVANCE_CREATED',
    actor: 'consumer_demo',
    details: 'Submitted electricity grievance MSED-2026-89412 via web portal',
    timestamp: '2026-09-09T18:30:00Z'
  }
];

export const INITIAL_AI_FEEDBACK = [];

export const INITIAL_SYSTEM_SETTINGS = {
  autoRoutingEnabled: true,
  confidenceThreshold: 0.75,
  duplicateRadiusKm: 0.5,
  duplicateTimeHours: 2,
  slaHighHours: 8,
  slaCriticalHours: 2
};
