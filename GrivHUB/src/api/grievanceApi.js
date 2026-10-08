import apiClient from './apiClient.js';

export const grievanceApi = {
  // 1. Real-time ML Inference on Title & Description
  classifyComplaint: async (title, text, customThreshold = 0.75) => {
    try {
      const response = await apiClient.post('/grievances/classify', {
        title: title || '',
        text: text || '',
        custom_threshold: customThreshold
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('ML classification fallback error:', error);
      throw error;
    }
  },

  // 2. Submit Grievance with Automatic ML Classification & Intelligent Routing
  submitGrievance: async (payload) => {
    const response = await apiClient.post('/grievances', payload);
    return response.data?.data || response.data;
  },

  // 3. List Grievances with Filters
  getGrievances: async (params = {}) => {
    const response = await apiClient.get('/grievances', { params });
    return response.data?.data || response.data;
  },

  // 4. Single Grievance Detail
  getGrievanceDetail: async (grievanceId) => {
    const response = await apiClient.get(`/grievances/${grievanceId}`);
    return response.data?.data || response.data;
  },

  // 5. Immutable Activity History Timeline (Phase 13)
  getTimeline: async (grievanceId) => {
    const response = await apiClient.get(`/grievances/${grievanceId}/timeline`);
    return response.data?.data || response.data;
  },

  // 6. Grievance Comments List
  getComments: async (grievanceId) => {
    const response = await apiClient.get(`/grievances/${grievanceId}/comments`);
    return response.data?.data || response.data;
  },

  // 7. Add Comment
  addComment: async (grievanceId, comment, isInternal = false) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/comments`, {
      comment,
      is_internal: isInternal
    });
    return response.data?.data || response.data;
  },

  // 8. Confirm Resolution (Citizen confirms & rates 1-5 stars)
  confirmResolution: async (grievanceId, rating, feedback) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/confirm-resolution`, {
      citizen_rating: rating,
      feedback_comments: feedback || ''
    });
    return response.data?.data || response.data;
  },

  // 9. Reopen Grievance (Citizen reopens with mandatory reason)
  reopenGrievance: async (grievanceId, reason) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/reopen`, {
      reopen_reason: reason
    });
    return response.data?.data || response.data;
  },

  // 10. List Notifications
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data?.data || response.data;
  },

  // 11. Unread Notifications Count
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data?.data || response.data;
  },

  // 12. Mark Notification as Read
  markNotificationRead: async (notificationId) => {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data?.data || response.data;
  },

  // 13. Mark All Notifications as Read
  markAllNotificationsRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data?.data || response.data;
  },

  // 14. List Departments
  getDepartments: async () => {
    const response = await apiClient.get('/departments');
    return response.data?.data || response.data;
  },

  // 15. ML Health & Model Metadata
  getMLHealth: async () => {
    const response = await apiClient.get('/ml/health');
    return response.data?.data || response.data;
  },

  // 16. Officer: Start Work (Moves status to IN_PROGRESS)
  startWork: async (grievanceId, notes = '') => {
    const response = await apiClient.post(`/grievances/${grievanceId}/start`, {
      notes: notes || 'Officer initiated investigation and field work crew operations.'
    });
    return response.data?.data || response.data;
  },

  // 17. Officer: Progress Milestone Update
  updateProgress: async (grievanceId, progressStage, progressNote, attachments = []) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/progress`, {
      progress_stage: progressStage,
      progress_note: progressNote,
      attachments: attachments || []
    });
    return response.data?.data || response.data;
  },

  // 18. Officer: Submit Resolution (Moves status to RESOLVED)
  submitResolution: async (grievanceId, resolutionSummary, resolutionDetails = '', images = [], documents = []) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/resolve`, {
      resolution_summary: resolutionSummary,
      resolution_details: resolutionDetails,
      resolution_images: images || [],
      resolution_documents: documents || []
    });
    return response.data?.data || response.data;
  },

  // 19. Officer / Admin: Correct AI Category
  correctCategory: async (grievanceId, correctedCategory, reason, triggerReroute = true) => {
    const response = await apiClient.post(`/grievances/${grievanceId}/correct-category`, {
      corrected_category: correctedCategory,
      reason: reason || 'Officer manual classification correction',
      trigger_reroute: triggerReroute
    });
    return response.data?.data || response.data;
  },

  // 20. Officer / Admin: Reassign Grievance
  reassignGrievance: async (grievanceId, newOfficerId, newDepartmentId, reason, notes = '') => {
    const response = await apiClient.post(`/grievances/${grievanceId}/reassign`, {
      new_officer_id: newOfficerId || null,
      new_department_id: newDepartmentId || null,
      reason: reason || 'Officer workload rebalance or jurisdiction transfer',
      notes: notes || ''
    });
    return response.data?.data || response.data;
  },

  // 21. Officer Workload Summary
  getOfficerWorkload: async (officerId) => {
    const response = await apiClient.get(`/officers/${officerId}/workload`);
    return response.data?.data || response.data;
  },

  // 22. Officer Profile Detail
  getOfficerProfile: async (officerId) => {
    const response = await apiClient.get(`/officers/${officerId}`);
    return response.data?.data || response.data;
  },

  // 23. Update Officer Profile
  updateOfficerProfile: async (officerId, updates) => {
    const response = await apiClient.patch(`/officers/${officerId}`, updates);
    return response.data?.data || response.data;
  },

  // 24. Update Officer Availability Status
  updateOfficerAvailability: async (officerId, availabilityStatus) => {
    const response = await apiClient.patch(`/officers/${officerId}/availability`, {
      availability_status: availabilityStatus
    });
    return response.data?.data || response.data;
  },

  // 25. List Officers
  getOfficers: async (params = {}) => {
    const response = await apiClient.get('/officers', { params });
    return response.data?.data || response.data;
  },

  // 26. Grievance Assignment History & Routing Audits
  getGrievanceHistory: async (grievanceId) => {
    const response = await apiClient.get(`/grievances/${grievanceId}/history`);
    return response.data?.data || response.data;
  },

  // ==========================================
  // PHASE 17 ADMIN MANAGEMENT APIS
  // ==========================================

  // 27. Admin Dashboard Aggregated Statistics
  getAdminDashboardStats: async () => {
    const response = await apiClient.get('/analytics/msedcl-overview/');
    return response.data?.data || response.data;
  },

  // 28. Admin Operational Alerts Queue
  getAdminAlerts: async () => {
    const response = await apiClient.get('/analytics/msedcl-overview/');
    return response.data?.alerts || [];
  },

  // 29. Admin User Management
  getAdminUsers: async (params = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data?.data || response.data;
  },

  createAdminUser: async (userData) => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data?.data || response.data;
  },

  updateAdminUser: async (userId, updates) => {
    const response = await apiClient.patch(`/admin/users/${userId}`, updates);
    return response.data?.data || response.data;
  },

  // 30. Admin Officer Management
  createOfficer: async (officerData) => {
    const response = await apiClient.post('/officers', officerData);
    return response.data?.data || response.data;
  },

  // 31. Admin Department Management
  createDepartment: async (deptData) => {
    const response = await apiClient.post('/departments', deptData);
    return response.data?.data || response.data;
  },

  updateDepartment: async (deptId, updates) => {
    const response = await apiClient.patch(`/departments/${deptId}`, updates);
    return response.data?.data || response.data;
  },

  // 32. Admin Jurisdictions
  getJurisdictions: async () => {
    const response = await apiClient.get('/jurisdictions');
    return response.data?.data?.jurisdictions || response.data?.jurisdictions || [];
  },

  createJurisdiction: async (jurData) => {
    const response = await apiClient.post('/jurisdictions', jurData);
    return response.data?.data || response.data;
  },

  updateJurisdiction: async (jurId, updates) => {
    const response = await apiClient.patch(`/jurisdictions/${jurId}`, updates);
    return response.data?.data || response.data;
  },

  // 33. Admin Routing Rules
  getAdminRoutingRules: async () => {
    const response = await apiClient.get('/admin/routing/rules');
    return response.data?.data?.rules || response.data?.rules || [];
  },

  updateAdminRoutingRule: async (category, departmentId, reason = '') => {
    const response = await apiClient.post('/admin/routing/rules', {
      category,
      department_id: departmentId,
      reason
    });
    return response.data?.data || response.data;
  },

  // 34. Admin System Settings
  getAdminSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data?.data || response.data;
  },

  updateAdminSettings: async (settings) => {
    const response = await apiClient.post('/admin/settings', settings);
    return response.data?.data || response.data;
  },

  // 35. Admin Audit Trail
  getAdminAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data?.data || response.data;
  },

  // 36. Auto-closure manual trigger
  triggerAutoClosure: async () => {
    const response = await apiClient.post('/admin/auto-closure');
    return response.data?.data || response.data;
  },

  // 37. Database Integrity & Health Verification (Phase 19)
  getDatabaseIntegrity: async () => {
    const response = await apiClient.get('/admin/system/database-integrity');
    return response.data?.data || response.data;
  },

  // 38. Real MSEDCL SLA Engine Endpoints
  getSLAOverview: async () => {
    const response = await apiClient.get('/sla/overview/');
    return response.data;
  },

  getSLAGrievances: async (params = {}) => {
    const response = await apiClient.get('/sla/grievances/', { params });
    return response.data;
  },

  getSLAEscalations: async (params = {}) => {
    const response = await apiClient.get('/sla/escalations/', { params });
    return response.data;
  },

  getSLAPolicies: async () => {
    const response = await apiClient.get('/sla/policies/');
    return response.data;
  },

  createSLAPolicy: async (policyData) => {
    const response = await apiClient.post('/sla/policies/', policyData);
    return response.data;
  },

  updateSLAPolicy: async (policyId, policyData) => {
    const response = await apiClient.patch(`/sla/policies/${policyId}/`, policyData);
    return response.data;
  },

  pauseSLA: async (grievanceId, reasonType, reasonNotes) => {
    const response = await apiClient.post(`/sla/grievances/${grievanceId}/pause/`, {
      reason_type: reasonType,
      reason_notes: reasonNotes
    });
    return response.data;
  },

  resumeSLA: async (grievanceId) => {
    const response = await apiClient.post(`/sla/grievances/${grievanceId}/resume/`);
    return response.data;
  },

  triggerProcessSLA: async () => {
    const response = await apiClient.post('/sla/process/');
    return response.data;
  }
};

export default grievanceApi;
