/**
 * Model Mapper Utility
 * Seamlessly normalizes backend snake_case MongoDB models with frontend camelCase representations.
 */

export function mapBackendGrievanceToFrontend(raw) {
  if (!raw) return null;
  const id = raw.grievance_id || raw.id || `GRV-${Date.now()}`;
  const grievanceNumber = raw.grievance_id || raw.grievanceNumber || id;

  return {
    id: id,
    grievanceNumber: grievanceNumber,
    citizenId: raw.consumer?.id ? String(raw.consumer.id) : (raw.consumer_id ? String(raw.consumer_id) : (raw.citizen_id || raw.citizenId || '')),
    consumerId: raw.consumer?.id ? String(raw.consumer.id) : (raw.consumer_id ? String(raw.consumer_id) : null),
    citizenName: raw.consumer?.name || raw.citizen_name || raw.citizenName || 'Electricity Consumer',
    citizenMobile: raw.consumer?.phone || raw.citizen_phone || raw.citizenMobile || '',
    consumerName: raw.consumer?.name || raw.consumer_name || raw.citizen_name || 'Electricity Consumer',
    title: raw.title || '',
    description: raw.description || '',
    consumerNumber: raw.consumer_number || raw.consumerNumber || raw.consumer?.consumer_number || '',
    selectedCategoryId: raw.selected_category_id || raw.selectedCategoryId,
    finalCategoryId: raw.predicted_category || raw.finalCategoryId || 'cat_10',
    finalCategoryName: raw.officer_final_category || raw.predicted_category || raw.finalCategoryName || 'General Consumer Services',
    departmentId: raw.assigned_department_id || raw.departmentId || 'dept_power_supply',
    departmentName: raw.assigned_department_name || raw.departmentName || raw.department?.name || 'Power Supply & Operations',
    assignedOfficerId: raw.assigned_officer_id || raw.assignedOfficerId,
    assignedOfficerName: raw.assigned_officer_name || raw.assignedOfficerName || raw.assigned_officer?.name || (raw.assigned_officer_id ? 'Assigned Field Engineer' : null),
    status: raw.status || 'SUBMITTED',
    priority: raw.priority || 'MEDIUM',
    prioritySource: raw.priority_source || raw.prioritySource || 'RULE_BASED',
    priorityReason: raw.priority_reason || raw.priorityReason || '',
    safetyRiskLevel: raw.safety_risk_level || raw.safetyRiskLevel || 'NONE',
    escalationLevel: raw.sla?.escalation_level || raw.escalation_level || 'NONE',
    escalationReason: raw.escalation_reason || raw.sla?.pause_reason,
    location: raw.location || {
      state: 'Maharashtra',
      district: 'Pune',
      city: 'Pune',
      region: 'Pune Region',
      circle: 'Pune Urban Circle',
      division: 'Shivajinagar Division',
      subDivision: 'Shivajinagar Sub-Division',
      serviceArea: 'Shivajinagar 33kV Substation',
      locality: 'Shivajinagar',
      pinCode: '411005'
    },
    attachments: raw.attachments || [],
    aiPrediction: {
      predictedCategoryName: raw.predicted_category || raw.aiPrediction?.predictedCategoryName || 'General Consumer Services',
      confidence: typeof raw.classification_confidence === 'number' ? raw.classification_confidence : (raw.aiPrediction?.confidence || 0.85),
      classificationStatus: raw.classification_status || 'AUTO_CLASSIFIED',
      modelVersion: raw.model_version || '1.0.0',
      isAutoRouted: (raw.classification_status === 'AUTO_CLASSIFIED'),
      summary: raw.summary || '',
      categorySource: raw.category_source || 'LOCAL_ML',
      safetyFlag: Boolean(raw.safety_flag),
      safetyRiskLevel: raw.safety_risk_level || 'NONE',
      safetyReason: raw.safety_reason || '',
      detectedEntities: raw.detected_entities || {}
    },
    submittedAt: raw.created_at || raw.submittedAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
    resolvedAt: raw.resolved_at || raw.resolvedAt,
    closedAt: raw.closed_at || raw.closedAt,
    reopenedCount: raw.reopen_count || raw.reopenedCount || 0,
    citizenRating: raw.citizen_rating || raw.citizenRating,
    citizenFeedbackText: raw.feedback_comments || raw.citizenFeedbackText,
    routingAudit: raw.routing_audit || [],
    sla: {
      policyName: raw.sla?.policy_name || 'MSEDCL Standard SLA',
      status: raw.sla?.sla_status || raw.sla_status || 'ACTIVE',
      escalationLevel: raw.sla?.escalation_level || raw.escalation_level || 'NONE',
      escalationDisplay: raw.sla?.escalation_display || raw.escalation_level || 'Normal Handling',
      dueAt: raw.sla?.due_at || raw.due_at || null,
      breachedAt: raw.sla?.breached_at || raw.breached_at || null,
      remainingSeconds: typeof raw.sla?.remaining_seconds === 'number' ? raw.sla.remaining_seconds : null,
      isOverdue: Boolean(raw.sla?.is_overdue),
      isWarning: Boolean(raw.sla?.is_warning || raw.sla?.sla_status === 'WARNING'),
      isPaused: Boolean(raw.sla?.is_paused),
      pauseReason: raw.sla?.pause_reason || '',
      totalPausedSeconds: raw.sla?.total_paused_seconds || 0
    },
    progressUpdates: raw.progress_updates || [],
    resolutionSummary: raw.resolution_summary || '',
    resolutionDetails: raw.resolution_details || '',
    resolutionEvidence: raw.resolution_evidence || []
    ,
    citizenRating: raw.citizen_rating || raw.citizenRating,
    citizenFeedbackText: raw.citizen_feedback || raw.citizenFeedbackText || raw.feedback_comments || '',
    reopenReason: raw.reopen_reason || raw.reopenReason || ''
  };
}

export function mapFrontendGrievanceToBackend(payload, currentUser) {
  return {
    title: payload.title,
    description: payload.description,
    citizen_id: currentUser?.id || 'usr_cit_01',
    citizen_name: currentUser?.fullName || 'Ramesh Pawar',
    citizen_phone: currentUser?.mobile || '+91 9876543210',
    location: payload.location,
    attachments: payload.attachments || [],
    consumer_number: payload.consumerNumber || currentUser?.consumerNumber || '',
    priority: payload.priority || 'MEDIUM',
    department_id: payload.departmentId,
    selected_category: payload.selectedCategoryName
  };
}
