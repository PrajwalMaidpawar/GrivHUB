import React, { useState, useEffect, useCallback } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import { SLABadge } from '../common/SLABadge.jsx';
import { Modal } from '../common/Modal.jsx';
import { OfficialReceiptModal } from '../common/OfficialReceiptModal.jsx';
import { grievanceApi } from '../../api/grievanceApi.js';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Sparkles,
  FileText,
  Phone,
  ShieldAlert,
  Edit3,
  Printer,
  RefreshCw,
  Clock,
  Send,
  User,
  Shield,
  Layers,
  MapPin,
  AlertTriangle,
  UploadCloud,
  Check,
  ChevronRight,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Timer
} from 'lucide-react';

export const OfficerGrievanceDetail = ({
  grievanceId,
  onBack
}) => {
  const {
    getGrievanceById,
    categories,
    departments,
    fetchOfficers,
    fetchGrievanceTimeline,
    fetchGrievanceComments,
    officerStartWork,
    officerUpdateProgress,
    officerSubmitResolution,
    officerCorrectCategory,
    officerReassign,
    addGrievanceUpdate,
    refreshGrievances,
    timelineMap,
    updatesMap
  } = useGrievance();

  const { currentUser } = useAuth();
  const { t } = useI18n();

  const grievance = getGrievanceById(grievanceId);

  // Local states
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [officersList, setOfficersList] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modals state
  const [isStartWorkModalOpen, setIsStartWorkModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isAICorrectionModalOpen, setIsAICorrectionModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('WAITING_FOR_CONSUMER');
  const [pauseCustomReason, setPauseCustomReason] = useState('');

  // Form states
  const [startWorkNotes, setStartWorkNotes] = useState('');
  const [progressStage, setProgressStage] = useState('SITE_INSPECTION_COMPLETED');
  const [progressNote, setProgressNote] = useState('');
  const [progressAttachment, setProgressAttachment] = useState('');

  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [resolutionImage, setResolutionImage] = useState('');

  const [correctedCategory, setCorrectedCategory] = useState(grievance?.finalCategoryName || '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [triggerReroute, setTriggerReroute] = useState(true);

  const [reassignReason, setReassignReason] = useState('WRONG_JURISDICTION');
  const [reassignOfficerId, setReassignOfficerId] = useState('');
  const [reassignDeptId, setReassignDeptId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');

  // Comment Box State
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Load timeline and comments
  const loadGrievanceDetails = useCallback(async () => {
    if (!grievance?.id) return;
    setIsLoadingTimeline(true);
    try {
      const [tl, cmts, offs] = await Promise.all([
        fetchGrievanceTimeline(grievance.id),
        fetchGrievanceComments(grievance.id),
        fetchOfficers({ department_id: grievance.departmentId })
      ]);
      if (tl) setTimeline(tl);
      if (cmts) setComments(cmts);
      if (offs) setOfficersList(offs);
    } catch (err) {
      console.warn('Failed to load timeline:', err);
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [grievance, fetchGrievanceTimeline, fetchGrievanceComments, fetchOfficers]);

  useEffect(() => {
    loadGrievanceDetails();
  }, [loadGrievanceDetails]);

  if (!grievance) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <p className="text-slate-600 text-sm font-semibold">Grievance record not found.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
        >
          Return to Work Queue
        </button>
      </div>
    );
  }

  // 1. Start Work Handler
  const handleStartWorkSubmit = async () => {
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await officerStartWork(grievance.id, startWorkNotes.trim());
      setActionSuccess('Field work initiated successfully. Grievance status moved to IN_PROGRESS.');
      setIsStartWorkModalOpen(false);
      setStartWorkNotes('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to initiate work.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Progress Milestone Update Handler
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!progressNote.trim()) return;
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const attachments = progressAttachment.trim()
        ? [{ name: 'Field Inspection Photo', url: progressAttachment.trim(), type: 'image/jpeg' }]
        : [];
      await officerUpdateProgress(grievance.id, progressStage, progressNote.trim(), attachments);
      setActionSuccess('Progress milestone recorded and citizen timeline updated.');
      setIsProgressModalOpen(false);
      setProgressNote('');
      setProgressAttachment('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to record progress milestone.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 3. Resolution Submission Handler
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const images = resolutionImage.trim()
        ? [{ name: 'Resolution Completion Proof', url: resolutionImage.trim(), type: 'image/jpeg' }]
        : [];
      await officerSubmitResolution(
        grievance.id,
        resolutionSummary.trim(),
        resolutionDetails.trim(),
        images
      );
      setActionSuccess('Resolution submitted successfully. Grievance is now awaiting citizen confirmation.');
      setIsResolveModalOpen(false);
      setResolutionSummary('');
      setResolutionDetails('');
      setResolutionImage('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to submit resolution.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 4. AI Correction Handler
  const handleAICorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctedCategory.trim() || !correctionReason.trim()) return;
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await officerCorrectCategory(
        grievance.id,
        correctedCategory.trim(),
        correctionReason.trim(),
        triggerReroute
      );
      setActionSuccess(`Category corrected to "${correctedCategory}". ${triggerReroute ? 'Grievance re-routed to appropriate department.' : ''}`);
      setIsAICorrectionModalOpen(false);
      setCorrectionReason('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to correct category.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 5. Reassignment Handler
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await officerReassign(
        grievance.id,
        reassignOfficerId || null,
        reassignDeptId || null,
        reassignReason,
        reassignNotes.trim()
      );
      setActionSuccess('Grievance reassigned successfully.');
      setIsReassignModalOpen(false);
      setReassignNotes('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to reassign grievance.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 5b. SLA Pause and Resume Handlers
  const handlePauseSLASubmit = async (e) => {
    e.preventDefault();
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const finalReason = pauseReason === 'OTHER' ? (pauseCustomReason.trim() || 'Other operational delay') : pauseReason;
      await grievanceApi.pauseSLA(grievance.id, finalReason);
      setActionSuccess('SLA resolution clock successfully paused.');
      setIsPauseModalOpen(false);
      setPauseCustomReason('');
      await refreshGrievances();
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Failed to pause SLA clock.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResumeSLASubmit = async () => {
    setIsProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await grievanceApi.resumeSLA(grievance.id);
      setActionSuccess('SLA resolution clock successfully resumed.');
      await refreshGrievances();
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Failed to resume SLA clock.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 6. Direct Note / Comment Submission
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    setActionError(null);
    try {
      await addGrievanceUpdate(grievance.id, commentText.trim(), [], isInternalComment);
      setCommentText('');
      await loadGrievanceDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to post note.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const effectiveTimeline = timeline.length > 0 ? timeline : (timelineMap[grievance.id] || []);
  const effectiveComments = comments.length > 0 ? comments : (updatesMap[grievance.id] || []);

  return (
    <div className="space-y-6" id="officer-grievance-workspace">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Work Queue</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 px-3.5 py-2 rounded-xl shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Official Receipt</span>
          </button>
          <PriorityBadge priority={grievance.priority} />
          <StatusBadge status={grievance.status} size="lg" />
        </div>
      </div>

      {/* Notifications / Feedback Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold underline text-xs ml-2">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold underline text-xs ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Complaint Details Surface */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              {grievance.grievanceNumber}
            </span>
            <span className="text-xs text-slate-400">
              Registered: {new Date(grievance.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
            {grievance.finalCategoryName}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-4 leading-tight">
          {grievance.title}
        </h1>
        <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-line">
          {grievance.description}
        </p>

        {/* Priority Reason & Safety Alert */}
        {grievance.priority === 'CRITICAL' && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Critical Electrical Safety Priority:</span> Immediate field attendance required under MSEDCL safety procedures.
            </div>
          </div>
        )}

        {/* Officer Lifecycle Action Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-2.5">
          {/* Start Work Action */}
          {grievance.status === 'ASSIGNED' && (
            <button
              onClick={() => setIsStartWorkModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Field Work</span>
            </button>
          )}

          {/* Progress Milestone Action */}
          {(grievance.status === 'IN_PROGRESS' || grievance.status === 'ASSIGNED' || grievance.status === 'REOPENED') && (
            <button
              onClick={() => setIsProgressModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Update Progress Milestone</span>
            </button>
          )}

          {/* Resolve Action */}
          {(grievance.status === 'IN_PROGRESS' || grievance.status === 'ASSIGNED' || grievance.status === 'REOPENED') && (
            <button
              onClick={() => setIsResolveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submit Resolution</span>
            </button>
          )}

          {/* AI Category Review Action */}
          <button
            onClick={() => {
              setCorrectedCategory(grievance.finalCategoryName || categories[0]?.name);
              setIsAICorrectionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>AI Review / Correct Category</span>
          </button>

          {/* Reassign Action */}
          <button
            onClick={() => setIsReassignModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Request Reassignment</span>
          </button>
        </div>
      </div>

      {/* 2-Column Content: AI Transparency & Notes | Citizen Info & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Model Audit & Field Timeline / Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Classification & Routing Audit Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  ML Classification & Routing Audit
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                Model: {grievance.aiPrediction?.modelVersion || 'v1.0.0-verified'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Original AI Prediction</span>
                <p className="font-bold text-white text-sm">
                  {grievance.aiPrediction?.predictedCategoryName || 'N/A'}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                  <span>Confidence:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round((grievance.aiPrediction?.confidence || 0.85) * 100)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Assigned Department & Pool</span>
                <p className="font-bold text-emerald-400 text-sm">
                  {grievance.departmentName}
                </p>
                <p className="text-[11px] text-slate-400">
                  Assigned Officer: <strong className="text-slate-200">{grievance.assignedOfficerName || currentUser.fullName}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Classification Status:</span>
              <span className="font-mono font-semibold text-emerald-300">
                {grievance.aiPrediction?.isAutoRouted ? 'AUTO_ROUTED_RULE_ENGINE' : 'ASSIGNED_TO_OFFICER'}
              </span>
            </div>
          </div>

          {/* Tabbed Officer Notes Section (Public Citizen Update vs Protected Internal Note) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Officer Field Log & Citizen Updates</h2>

            {/* Note Composer */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="note_visibility"
                    checked={!isInternalComment}
                    onChange={() => setIsInternalComment(false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={!isInternalComment ? 'text-blue-700 font-bold' : 'text-slate-600'}>
                    Citizen Update (Public)
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="note_visibility"
                    checked={isInternalComment}
                    onChange={() => setIsInternalComment(true)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className={isInternalComment ? 'text-amber-800 font-bold flex items-center gap-1' : 'text-slate-600 flex items-center gap-1'}>
                    <Shield className="w-3 h-3 text-amber-600" />
                    Internal Officer Note (Protected)
                  </span>
                </label>
              </div>

              {isInternalComment && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                  <span>Internal notes are protected and only visible to authorized municipal officers & administrators.</span>
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isInternalComment
                      ? "Write internal operational note (contractor contact, equipment requisition, etc.)..."
                      : "Write message or update visible to citizen on their tracking portal..."
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingComment ? 'Posting...' : isInternalComment ? 'Post Internal Note' : 'Post Citizen Update'}</span>
                </button>
              </div>
            </form>

            {/* Note & Comment Feed */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Logged Notes ({effectiveComments.length})
              </h3>
              {effectiveComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No notes logged yet. Use the composer above to log progress.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {effectiveComments.map((c, i) => {
                    const isInternal = c.is_internal || c.visibility === 'INTERNAL' || c.isInternal;
                    return (
                      <div
                        key={c.comment_id || c.id || i}
                        className={`p-3.5 rounded-xl border text-xs ${
                          isInternal
                            ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <div className="flex items-center gap-1.5">
                            <span>{c.author_name || c.authorName || 'Officer'}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({c.author_role || c.authorRole || 'MUNICIPAL_OFFICER'})
                            </span>
                            {isInternal && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-bold">
                                INTERNAL
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at || c.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{c.comment || c.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Immutable Activity Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Immutable Audit Lifecycle Timeline</h2>
              <button
                onClick={loadGrievanceDetails}
                disabled={isLoadingTimeline}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingTimeline ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {effectiveTimeline.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Timeline audit trail loading from municipal backend...
              </p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {effectiveTimeline.map((item, idx) => (
                  <div key={item.activity_id || item.id || idx} className="relative flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs flex-shrink-0 z-10">
                      {idx + 1}
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.description || item.activity_type}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at || item.timestamp || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Actor: {item.actor_name || item.actor_id} ({item.actor_role})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Citizen Details & Location & Attachments */}
        <div className="space-y-6">
          {/* MSEDCL SLA Policy & Operational Status Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  MSEDCL SLA Status
                </h3>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">
                24h Continuous Clock
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-slate-400">Assigned Policy</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {grievance.sla?.policy_name || 'MSEDCL Standard SLA Policy'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-1">Live Resolution Timer</p>
                <SLABadge sla={grievance.sla} status={grievance.status} priority={grievance.priority} showProgress={true} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400">Target Time:</span>
                  <p className="font-semibold text-slate-800">
                    {grievance.sla?.target_minutes ? `${Math.floor(grievance.sla.target_minutes / 60)}h ${grievance.sla.target_minutes % 60}m` : '24h 00m'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Due Deadline:</span>
                  <p className="font-semibold text-slate-800">
                    {grievance.sla?.due_at ? new Date(grievance.sla.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Pending'}
                  </p>
                </div>
              </div>

              {grievance.sla?.escalation_level && grievance.sla.escalation_level !== 'NONE' && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Utility Escalation Active:</span>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Escalated to <strong>{grievance.sla.escalation_display || grievance.sla.escalation_level}</strong> for oversight.
                    </p>
                  </div>
                </div>
              )}

              {/* SLA Pause / Resume Operational Controls */}
              {grievance.status !== 'RESOLVED' && grievance.status !== 'CLOSED' && (
                <div className="pt-2 border-t border-slate-100">
                  {grievance.sla?.is_paused ? (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                        <span className="font-bold">Clock Paused:</span> {grievance.sla?.pause_reason || 'Pending consumer action'}
                      </div>
                      <button
                        onClick={handleResumeSLASubmit}
                        disabled={isProcessingAction}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Resume SLA Clock</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsPauseModalOpen(true)}
                      disabled={isProcessingAction}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <PauseCircle className="w-4 h-4 text-slate-500" />
                      <span>Pause SLA Clock (Operational Delay)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Citizen Contact Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Complainant Consumer Info
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {(grievance.citizenName || 'C').charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{grievance.citizenName || 'Consumer'}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{grievance.citizenMobile}</span>
                </p>
                {grievance.consumerNumber && (
                  <p className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5">
                    CA: {grievance.consumerNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* MSEDCL Jurisdiction & Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              MSEDCL Jurisdiction & Location
            </h3>
            <div className="space-y-2.5 text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">MSEDCL Circle / Zone:</span>
                <span className="font-semibold text-slate-900">{grievance.location?.region || 'Pune Circle'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Sub-Division / Feeder:</span>
                <span className="font-semibold text-slate-900">{grievance.location?.serviceArea || 'Pune Urban Sub-Division'} ({grievance.location?.division || 'Division 1'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Locality:</span>
                <span className="font-medium text-slate-800">{grievance.location?.locality || grievance.location?.city}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">PIN Code:</span>
                <span className="font-mono font-medium text-slate-800">{grievance.location?.pinCode || '411005'}</span>
              </div>
              {grievance.location?.landmark && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Landmark:</span>
                  <span className="font-medium text-slate-800">{grievance.location.landmark}</span>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Attached Evidence */}
          {grievance.attachments && grievance.attachments.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Citizen Attached Evidence ({grievance.attachments.length})
              </h3>
              <div className="space-y-2">
                {grievance.attachments.map((att, i) => (
                  <div
                    key={att.id || i}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => att.url && window.open(att.url, '_blank')}
                  >
                    {att.url ? (
                      <img src={att.url} alt={att.name} className="w-12 h-12 rounded-lg object-cover bg-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        FILE
                      </div>
                    )}
                    <div className="text-xs truncate">
                      <p className="font-semibold text-slate-900 truncate">{att.name || 'Evidence Photo'}</p>
                      <p className="text-[10px] text-slate-400">Click to view full asset</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. START WORK MODAL */}
      <Modal
        isOpen={isStartWorkModalOpen}
        onClose={() => setIsStartWorkModalOpen(false)}
        title="Initiate Field Operations & Crew Dispatch"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Accepting this grievance transitions status to <strong>IN_PROGRESS</strong> and dispatches operational notification to the citizen.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Dispatch Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={startWorkNotes}
              onChange={(e) => setStartWorkNotes(e.target.value)}
              placeholder="e.g. Assigned to Field Inspection Team #4. Site visit scheduled for today..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={() => setIsStartWorkModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleStartWorkSubmit}
              disabled={isProcessingAction}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Starting...' : 'Confirm & Start Work'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. PROGRESS MILESTONE MODAL */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="Record Field Progress Milestone"
        maxWidth="md"
      >
        <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Progress Stage <span className="text-red-500">*</span>
            </label>
            <select
              value={progressStage}
              onChange={(e) => setProgressStage(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="SITE_INSPECTION_COMPLETED">Site Inspection Completed</option>
              <option value="FIELD_CREW_DISPATCHED">Field Crew Dispatched</option>
              <option value="REPAIR_INITIATED">Repair / Maintenance Initiated</option>
              <option value="AWAITING_MATERIALS">Awaiting Materials / Machinery</option>
              <option value="TESTING_AND_VERIFICATION">Testing & Quality Verification</option>
              <option value="FINAL_CLEANUP">Final Site Cleanup</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Progress Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Describe on-ground progress (e.g. Excavator on site, drain cleared 40m, pipeline welded)..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Field Photo URL / Proof (Optional)
            </label>
            <input
              type="url"
              value={progressAttachment}
              onChange={(e) => setProgressAttachment(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsProgressModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!progressNote.trim() || isProcessingAction}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Recording...' : 'Record Milestone'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. RESOLUTION SUBMISSION MODAL */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Submit Municipal Grievance Resolution"
        maxWidth="md"
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Resolution Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="e.g. Potholes on MG Road resurfaced with hot-mix asphalt and sealed."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Detailed Work Report (Optional)
            </label>
            <textarea
              rows={3}
              value={resolutionDetails}
              onChange={(e) => setResolutionDetails(e.target.value)}
              placeholder="Detail work done, materials used, inspection results..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Completion Photo URL / Evidence
            </label>
            <input
              type="url"
              value={resolutionImage}
              onChange={(e) => setResolutionImage(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
            Submitting resolution moves status to <strong>RESOLVED</strong> and invites the citizen to verify and rate the service (1-5 stars).
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!resolutionSummary.trim() || isProcessingAction}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Submitting...' : 'Submit Resolution'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. AI CORRECTION MODAL */}
      <Modal
        isOpen={isAICorrectionModalOpen}
        onClose={() => setIsAICorrectionModalOpen(false)}
        title="Human AI Category Review & Correction"
        maxWidth="md"
      >
        <form onSubmit={handleAICorrectionSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-[11px]">
            Officer category corrections preserve the original ML model prediction audit trail and are logged to train future model versions.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Correct Municipal Category <span className="text-red-500">*</span>
            </label>
            <select
              value={correctedCategory}
              onChange={(e) => setCorrectedCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name} ({cat.departmentName || cat.department_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correction Justification / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Field inspection revealed road damage was caused by an underground water main leak..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trigger_reroute"
              checked={triggerReroute}
              onChange={(e) => setTriggerReroute(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="trigger_reroute" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Automatically trigger re-routing to corresponding department
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAICorrectionModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!correctionReason.trim() || isProcessingAction}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Saving...' : 'Save Correction & Re-route'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. REASSIGNMENT REQUEST MODAL */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Request Grievance Reassignment"
        maxWidth="md"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reassignment Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value="WRONG_JURISDICTION">Outside Assigned Ward / Jurisdiction</option>
              <option value="WRONG_DEPARTMENT">Cross-Departmental Issue</option>
              <option value="WORKLOAD_CAPACITY_EXCEEDED">Officer Workload Capacity Exceeded</option>
              <option value="OFFICER_ON_LEAVE">Officer on Field Leave / Training</option>
              <option value="SPECIALIST_REQUIRED">Requires Specialized Engineering Wing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Transfer to Specific Officer (Optional - leaves blank for auto-dispatch)
            </label>
            <select
              value={reassignOfficerId}
              onChange={(e) => setReassignOfficerId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value="">-- Automatic Least-Loaded Officer Dispatch --</option>
              {officersList.map((off) => (
                <option key={off.officer_id || off.id} value={off.officer_id || off.id}>
                  {off.name || off.fullName} ({off.designation || 'Officer'}) - Workload: {off.current_workload ?? off.currentWorkload ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Explanation & Transfer Notes
            </label>
            <textarea
              rows={3}
              value={reassignNotes}
              onChange={(e) => setReassignNotes(e.target.value)}
              placeholder="State reasons for transfer to assist receiving officer..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReassignModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingAction}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. PAUSE SLA CLOCK MODAL */}
      <Modal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        title="Pause SLA Resolution Clock"
        maxWidth="md"
      >
        <form onSubmit={handlePauseSLASubmit} className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Pausing the resolution clock suspends the countdown against SLA breach. This must be justified by an approved MSEDCL operational delay condition and is recorded in the immutable audit log.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Approved Pause Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value="WAITING_FOR_CONSUMER">Awaiting Consumer Confirmation / Premise Access</option>
              <option value="MATERIAL_REQUISITION">Material / Transformer Requisition from Central Store</option>
              <option value="PERMIT_PENDING">Statutory Permit / Road Digging Clearance Pending</option>
              <option value="SAFETY_CLEARANCE">Grid Disconnect / Safety Hazard Clearance Required</option>
              <option value="WEATHER_EMERGENCY">Severe Weather / Grid Storm Emergency</option>
              <option value="OTHER">Other Operational Delay (Specify Below)</option>
            </select>
          </div>

          {pauseReason === 'OTHER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detailed Reason Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={pauseCustomReason}
                onChange={(e) => setPauseCustomReason(e.target.value)}
                placeholder="State precise reason for pausing resolution clock..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
                required
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPauseModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingAction}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-50 shadow-2xs"
            >
              {isProcessingAction ? 'Pausing...' : 'Confirm Pause SLA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Receipt Modal */}
      <OfficialReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        grievance={grievance}
      />
    </div>
  );
};
