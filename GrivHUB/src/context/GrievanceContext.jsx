import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INITIAL_GRIEVANCES,
  INITIAL_DEPARTMENTS,
  INITIAL_CATEGORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AI_FEEDBACK,
  INITIAL_SYSTEM_SETTINGS
} from '../data/initialData.js';
import { INITIAL_ML_MODEL_STATUS } from '../ml/datasetPipelineInfo.js';
import { useAuth } from './AuthContext.jsx';
import grievanceApi from '../api/grievanceApi.js';
import { mapBackendGrievanceToFrontend, mapFrontendGrievanceToBackend } from '../api/modelMapper.js';

const GrievanceContext = createContext(undefined);

export const GrievanceProvider = ({ children }) => {
  const authContext = useAuth();
  const currentUser = authContext?.currentUser || {
    id: 'usr_cit_01',
    fullName: 'Ramesh Kulkarni',
    role: 'CITIZEN',
    mobile: '+91 9881098765'
  };
  const allUsers = authContext?.allUsers || [];

  const [grievances, setGrievances] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_grievances');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        return parsed.map(mapBackendGrievanceToFrontend);
      }
      return INITIAL_GRIEVANCES.map(mapBackendGrievanceToFrontend);
    } catch (e) {
      return INITIAL_GRIEVANCES.map(mapBackendGrievanceToFrontend);
    }
  });

  const [departments, setDepartments] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_departments');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        return parsed;
      }
      return INITIAL_DEPARTMENTS;
    } catch (e) {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_categories');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        return parsed;
      }
      return INITIAL_CATEGORIES;
    } catch (e) {
      return INITIAL_CATEGORIES;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_notifications');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_NOTIFICATIONS;
    } catch (e) {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_audit_logs');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_AUDIT_LOGS;
    } catch (e) {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [aiFeedbackList, setAiFeedbackList] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_ai_feedback');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_AI_FEEDBACK;
    } catch (e) {
      return INITIAL_AI_FEEDBACK;
    }
  });

  const [systemSettings, setSystemSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_system_settings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed.mlConfidenceThreshold === 'number') {
        return parsed;
      }
      return INITIAL_SYSTEM_SETTINGS;
    } catch (e) {
      return INITIAL_SYSTEM_SETTINGS;
    }
  });

  const [mlModelMetrics, setMlModelMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('grievancehub_ml_metrics');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.modelName) {
        return parsed;
      }
      return INITIAL_ML_MODEL_STATUS;
    } catch (e) {
      return INITIAL_ML_MODEL_STATUS;
    }
  });

  const [updatesMap, setUpdatesMap] = useState({});
  const [timelineMap, setTimelineMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('grievancehub_grievances', JSON.stringify(grievances));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [grievances]);

  useEffect(() => {
    try {
      localStorage.setItem('grievancehub_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [notifications]);

  // Fetch Live Data from Backend
  const refreshGrievances = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const params = {};
      if (currentUser?.role === 'CITIZEN' && currentUser.id) {
        params.citizen_id = currentUser.id;
      }
      const data = await grievanceApi.getGrievances(params);
      if (data && Array.isArray(data.grievances)) {
        const mapped = data.grievances.map(mapBackendGrievanceToFrontend);
        setGrievances(mapped);
      }
    } catch (err) {
      console.info('Backend grievance fetch info:', err.message);
      // Keep local state intact without breaking UI
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await grievanceApi.getNotifications({ user_id: currentUser.id });
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.info('Notification fetch info:', err.message);
    }
  }, [currentUser]);

  const checkMLHealth = useCallback(async () => {
    try {
      const data = await grievanceApi.getMLHealth();
      if (data && data.data) {
        setMlModelMetrics((prev) => ({
          ...prev,
          modelName: data.data.model_name || prev.modelName,
          modelVersion: data.data.model_version || prev.modelVersion,
          isLoaded: data.data.is_loaded ?? true,
          status: data.data.status || 'OPERATIONAL',
          accuracy: data.data.test_accuracy || prev.accuracy,
          vocabularyFeatures: data.data.vocabulary_features || 8270,
          targetCategoriesCount: data.data.target_categories_count || 8
        }));
      }
    } catch (err) {
      console.info('ML Health check info:', err.message);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    refreshGrievances();
    refreshNotifications();
    checkMLHealth();
  }, [refreshGrievances, refreshNotifications, checkMLHealth]);

  // Fetch Timeline for a Single Grievance
  const fetchGrievanceTimeline = useCallback(async (grievanceId) => {
    try {
      const data = await grievanceApi.getTimeline(grievanceId);
      if (data && Array.isArray(data.timeline)) {
        setTimelineMap((prev) => ({
          ...prev,
          [grievanceId]: data.timeline
        }));
        return data.timeline;
      }
    } catch (err) {
      console.info(`Timeline fetch for ${grievanceId}:`, err.message);
    }
    return timelineMap[grievanceId] || [];
  }, [timelineMap]);

  // Fetch Comments for a Single Grievance
  const fetchGrievanceComments = useCallback(async (grievanceId) => {
    try {
      const data = await grievanceApi.getComments(grievanceId);
      if (data && Array.isArray(data.comments)) {
        setUpdatesMap((prev) => ({
          ...prev,
          [grievanceId]: data.comments
        }));
        return data.comments;
      }
    } catch (err) {
      console.info(`Comments fetch for ${grievanceId}:`, err.message);
    }
    return updatesMap[grievanceId] || [];
  }, [updatesMap]);

  // Submit Grievance Multi-Step Flow
  const submitGrievance = async (input) => {
    setIsLoading(true);
    setApiError(null);

    const payload = mapFrontendGrievanceToBackend(input, currentUser);

    try {
      const result = await grievanceApi.submitGrievance(payload);
      const createdRaw = result?.grievance || result;
      const mapped = mapBackendGrievanceToFrontend(createdRaw);

      setGrievances((prev) => [mapped, ...prev.filter((g) => g.id !== mapped.id)]);
      await refreshNotifications();

      return {
        grievance: mapped,
        mlInference: result?.ml_inference,
        routing: result?.routing
      };
    } catch (err) {
      console.warn('Backend submit error, using local fallback:', err);
      // Fallback local creation
      const timestamp = new Date().toISOString();
      const count = grievances.length + 101;
      const formattedId = `GRV-2026-${String(count).padStart(6, '0')}`;
      const internalId = `grv_${Date.now()}`;

      const newGrievance = {
        id: internalId,
        grievanceNumber: formattedId,
        citizenId: currentUser.id,
        citizenName: currentUser.fullName,
        citizenMobile: currentUser.mobile,
        title: input.title,
        description: input.description,
        selectedCategoryId: input.selectedCategoryId,
        finalCategoryId: input.selectedCategoryId || 'cat_10',
        finalCategoryName: input.selectedCategoryName || 'General Consumer Services',
        departmentId: 'dept_power_supply',
        departmentName: 'Power Supply & Operations',
        assignedOfficerId: null,
        assignedOfficerName: null,
        status: 'PENDING_ASSIGNMENT',
        priority: input.priority || 'MEDIUM',
        consumerNumber: input.consumerNumber || currentUser.consumerNumber || '',
        location: input.location,
        attachments: input.attachments || [],
        aiPrediction: {
          predictedCategoryName: input.selectedCategoryName || 'General Consumer Services',
          confidence: 0.92,
          classificationStatus: 'AUTO_CLASSIFIED',
          modelVersion: '1.0.0',
          isAutoRouted: true
        },
        submittedAt: timestamp,
        updatedAt: timestamp,
        reopenedCount: 0
      };

      setGrievances((prev) => [newGrievance, ...prev]);
      return { grievance: newGrievance };
    } finally {
      setIsLoading(false);
    }
  };

  // Add Comment / Citizen Note
  const addGrievanceUpdate = async (grievanceId, content, attachments, isInternal = false) => {
    try {
      await grievanceApi.addComment(grievanceId, content, isInternal);
      await fetchGrievanceComments(grievanceId);
      await fetchGrievanceTimeline(grievanceId);
    } catch (err) {
      console.warn('Comment API error, falling back locally:', err);
      const newUpdate = {
        id: `upd_${Date.now()}`,
        grievance_id: grievanceId,
        author_id: currentUser.id,
        author_name: currentUser.fullName,
        author_role: currentUser.role,
        comment: content,
        created_at: new Date().toISOString()
      };
      setUpdatesMap((prev) => ({
        ...prev,
        [grievanceId]: [...(prev[grievanceId] || []), newUpdate]
      }));
    }
  };

  // Citizen confirms resolution
  const confirmResolution = async (grievanceId, rating, feedbackText) => {
    try {
      await grievanceApi.confirmResolution(grievanceId, rating, feedbackText);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
    } catch (err) {
      console.warn('Resolution confirmation API error, falling back locally:', err);
      const timestamp = new Date().toISOString();
      setGrievances((prev) =>
        prev.map((g) => {
          if (g.id === grievanceId) {
            return {
              ...g,
              status: 'CLOSED',
              updatedAt: timestamp,
              closedAt: timestamp,
              citizenRating: rating,
              citizenFeedbackText: feedbackText
            };
          }
          return g;
        })
      );
    }
  };

  // Citizen reopens grievance
  const reopenGrievance = async (grievanceId, reason) => {
    try {
      await grievanceApi.reopenGrievance(grievanceId, reason);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
    } catch (err) {
      console.warn('Reopen API error, falling back locally:', err);
      const timestamp = new Date().toISOString();
      setGrievances((prev) =>
        prev.map((g) => {
          if (g.id === grievanceId) {
            return {
              ...g,
              status: 'REOPENED',
              updatedAt: timestamp,
              reopenedCount: (g.reopenedCount || 0) + 1
            };
          }
          return g;
        })
      );
    }
  };

  // Officer: Start Work
  const officerStartWork = async (grievanceId, notes) => {
    setIsLoading(true);
    try {
      const result = await grievanceApi.startWork(grievanceId, notes);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
      await refreshNotifications();
      return result;
    } catch (err) {
      console.warn('Start work API error, local fallback:', err);
      const timestamp = new Date().toISOString();
      setGrievances((prev) =>
        prev.map((g) => (g.id === grievanceId ? { ...g, status: 'IN_PROGRESS', updatedAt: timestamp } : g))
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Officer: Update Progress
  const officerUpdateProgress = async (grievanceId, progressStage, progressNote, attachments = []) => {
    setIsLoading(true);
    try {
      const result = await grievanceApi.updateProgress(grievanceId, progressStage, progressNote, attachments);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
      await fetchGrievanceComments(grievanceId);
      return result;
    } catch (err) {
      console.warn('Progress update API error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Officer: Submit Resolution
  const officerSubmitResolution = async (grievanceId, summary, details = '', images = [], documents = []) => {
    setIsLoading(true);
    try {
      const result = await grievanceApi.submitResolution(grievanceId, summary, details, images, documents);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
      await refreshNotifications();
      return result;
    } catch (err) {
      console.warn('Resolution submission API error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Officer / Admin: Correct Category & Re-route
  const officerCorrectCategory = async (grievanceId, correctedCategory, reason, triggerReroute = true) => {
    setIsLoading(true);
    try {
      const result = await grievanceApi.correctCategory(grievanceId, correctedCategory, reason, triggerReroute);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
      await refreshNotifications();
      return result;
    } catch (err) {
      console.warn('Category correction API error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Officer / Admin: Request Reassignment
  const officerReassign = async (grievanceId, newOfficerId, newDepartmentId, reason, notes = '') => {
    setIsLoading(true);
    try {
      const result = await grievanceApi.reassignGrievance(grievanceId, newOfficerId, newDepartmentId, reason, notes);
      await refreshGrievances();
      await fetchGrievanceTimeline(grievanceId);
      await refreshNotifications();
      return result;
    } catch (err) {
      console.warn('Reassignment API error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Officer: Fetch Workload Summary
  const fetchOfficerWorkload = useCallback(async (officerId) => {
    try {
      const data = await grievanceApi.getOfficerWorkload(officerId);
      return data;
    } catch (err) {
      console.warn('Workload fetch error:', err);
      return null;
    }
  }, []);

  // Officer: Fetch Profile
  const fetchOfficerProfile = useCallback(async (officerId) => {
    try {
      const data = await grievanceApi.getOfficerProfile(officerId);
      return data;
    } catch (err) {
      console.warn('Officer profile fetch error:', err);
      return null;
    }
  }, []);

  // Officer: Update Availability Status
  const updateOfficerAvailability = async (officerId, availabilityStatus) => {
    try {
      const result = await grievanceApi.updateOfficerAvailability(officerId, availabilityStatus);
      return result;
    } catch (err) {
      console.warn('Availability update error:', err);
      throw err;
    }
  };

  // Officer: Update Profile
  const updateOfficerProfile = async (officerId, updates) => {
    try {
      const result = await grievanceApi.updateOfficerProfile(officerId, updates);
      return result;
    } catch (err) {
      console.warn('Officer profile update error:', err);
      throw err;
    }
  };

  // List Officers
  const fetchOfficers = useCallback(async (params = {}) => {
    try {
      const data = await grievanceApi.getOfficers(params);
      return data?.officers || [];
    } catch (err) {
      console.warn('Officers list fetch error:', err);
      return [];
    }
  }, []);

  // Fetch Grievance Assignment History
  const fetchGrievanceHistory = useCallback(async (grievanceId) => {
    try {
      const data = await grievanceApi.getGrievanceHistory(grievanceId);
      return data;
    } catch (err) {
      console.warn('Grievance history fetch error:', err);
      return null;
    }
  }, []);

  // Legacy helper mappings
  const updateGrievanceStatus = async (grievanceId, status, remarks = '', proof = '') => {
    if (status === 'IN_PROGRESS') {
      return await officerStartWork(grievanceId, remarks);
    } else if (status === 'RESOLVED') {
      return await officerSubmitResolution(grievanceId, remarks || 'Municipal repair completed', remarks, proof ? [proof] : []);
    } else if (status === 'CLOSED') {
      return await confirmResolution(grievanceId, 5, remarks);
    } else if (status === 'REOPENED') {
      return await reopenGrievance(grievanceId, remarks || 'Citizen unsatisfied with resolution');
    }
  };

  const correctAIPrediction = async (grievanceId, correctedCatName, reason) => {
    return await officerCorrectCategory(grievanceId, correctedCatName, reason, true);
  };

  const markNotificationRead = async (notifId) => {
    try {
      await grievanceApi.markNotificationRead(notifId);
    } catch (err) {
      // Ignored
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId || n.notification_id === notifId ? { ...n, is_read: true, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    try {
      await grievanceApi.markAllNotificationsRead();
    } catch (err) {
      // Ignored
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, isRead: true }))
    );
  };

  const getGrievanceById = (id) => {
    return grievances.find((g) => g.id === id || g.grievanceNumber === id);
  };

  return (
    <GrievanceContext.Provider
      value={{
        grievances,
        departments,
        categories,
        notifications,
        auditLogs,
        aiFeedbackList,
        aiFeedbackLogs: aiFeedbackList,
        systemSettings,
        mlModelMetrics,
        setMlModelMetrics,
        updatesMap,
        timelineMap,
        isLoading,
        apiError,
        refreshGrievances,
        refreshNotifications,
        fetchGrievanceTimeline,
        fetchGrievanceComments,
        submitGrievance,
        addGrievanceUpdate,
        confirmResolution,
        reopenGrievance,
        markNotificationRead,
        markAllNotificationsRead,
        getGrievanceById,
        // Phase 16 Officer Portal capabilities
        officerStartWork,
        officerUpdateProgress,
        officerSubmitResolution,
        officerCorrectCategory,
        officerReassign,
        fetchOfficerWorkload,
        fetchOfficerProfile,
        updateOfficerAvailability,
        updateOfficerProfile,
        fetchOfficers,
        fetchGrievanceHistory,
        updateGrievanceStatus,
        correctAIPrediction
      }}
    >
      {children}
    </GrievanceContext.Provider>
  );
};

export const useGrievance = () => {
  const context = useContext(GrievanceContext);
  if (!context) {
    throw new Error('useGrievance must be used within a GrievanceProvider');
  }
  return context;
};
