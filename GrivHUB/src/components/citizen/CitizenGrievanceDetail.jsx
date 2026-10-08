import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  MapPin,
  Sparkles,
  Paperclip,
  Send,
  Star,
  RotateCcw,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export const CitizenGrievanceDetail = ({
  grievanceId,
  onBack
}) => {
  const {
    getGrievanceById,
    fetchGrievanceTimeline,
    fetchGrievanceComments,
    timelineMap,
    updatesMap,
    addGrievanceUpdate,
    confirmResolution,
    reopenGrievance
  } = useGrievance();

  const { currentUser } = useAuth();
  const { t } = useI18n();

  const grievance = getGrievanceById(grievanceId);

  // States
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);

  // Resolution & Reopen Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  // Printable Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Fetch timeline and comments on mount
  useEffect(() => {
    if (grievanceId) {
      fetchGrievanceTimeline(grievanceId).then((res) => {
        if (Array.isArray(res)) setTimeline(res);
      });
      fetchGrievanceComments(grievanceId).then((res) => {
        if (Array.isArray(res)) setComments(res);
      });
    }
  }, [grievanceId, fetchGrievanceTimeline, fetchGrievanceComments]);

  // Sync with updatesMap and timelineMap from context
  const currentTimeline = timelineMap[grievanceId] || timeline || [];
  const currentComments = updatesMap[grievanceId] || comments || [];

  if (!grievance) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Grievance Record Not Found</h3>
        <p className="text-xs text-slate-500">The requested grievance could not be located in the municipal database.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await addGrievanceUpdate(grievanceId, commentText.trim(), [], false);
    setCommentText('');
    setIsSubmittingComment(false);
    const updated = await fetchGrievanceComments(grievanceId);
    if (Array.isArray(updated)) setComments(updated);
  };

  const handleConfirmResolution = async () => {
    await confirmResolution(grievanceId, rating, feedback);
    setIsConfirmModalOpen(false);
  };

  const handleReopen = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 10) {
      setReopenError('Please provide at least 10 characters explaining why the issue is not resolved.');
      return;
    }
    await reopenGrievance(grievanceId, reopenReason.trim());
    setIsReopenModalOpen(false);
    setReopenReason('');
    setReopenError('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="citizen-grievance-detail-view">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          id="back-to-list-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToMyGrievances')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Main Ticket Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {grievance.grievanceNumber}
            </span>
            <StatusBadge status={grievance.status} />
            <PriorityBadge priority={grievance.priority} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Submitted: {new Date(grievance.submittedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{grievance.title}</h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-100">
              {grievance.description}
            </p>
          </div>

          {/* AI Categorization & Routing Diagnostic */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-950">
                  AI Model Classification ({grievance.aiPrediction?.predictedCategoryName || grievance.finalCategoryName})
                </p>
                <p className="text-[11px] text-blue-700">
                  Predicted with {((grievance.aiPrediction?.confidence || 0.85) * 100).toFixed(1)}% confidence score • Automatic Electricity Service Dispatch
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                {grievance.aiPrediction?.classificationStatus || 'AUTO_CLASSIFIED'}
              </span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Department & Officer */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Assigned Authority</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900 border-b border-blue-100 pb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>MSEDCL SLA</span>
                  </div>
                  <p className="text-xs text-blue-900">
                    Target: {grievance.sla?.dueAt
                      ? new Date(grievance.sla.dueAt).toLocaleString('en-GB')
                      : 'SLA target is being calculated'}
                  </p>
                  <p className={`text-[11px] font-semibold ${grievance.sla?.isOverdue ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {grievance.sla?.isOverdue ? 'SLA breached - escalation may apply' : 'Within SLA target'}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Consumer Information</span>
                  </div>
                  <p className="text-xs text-slate-800">{grievance.consumerName || grievance.citizenName}</p>
                  <p className="text-[11px] text-slate-600">Consumer number: {grievance.consumerNumber || 'Not provided'}</p>
                </div>
              </div>

              {grievance.status === 'RESOLVED' || grievance.status === 'CLOSED' ? (
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Resolution Details
                  </h3>
                  <p className="text-sm font-semibold text-slate-900">{grievance.resolutionSummary || 'Resolution submitted by the field officer.'}</p>
                  {grievance.resolutionDetails && <p className="text-xs text-slate-700 whitespace-pre-line">{grievance.resolutionDetails}</p>}
                  {grievance.resolutionEvidence?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {grievance.resolutionEvidence.map((evidence, index) => (
                        <a key={index} href={evidence.url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-800">
                          <Paperclip className="w-3.5 h-3.5" />
                          {evidence.filename || evidence.name || `Resolution evidence ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="space-y-1 pt-1">
                <p className="font-semibold text-slate-900">{grievance.departmentName}</p>
                <p className="text-slate-600 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{grievance.assignedOfficerName || 'Ward Junior Engineer (Assigned)'}</span>
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Location & Jurisdiction</span>
              </div>
              <div className="space-y-1 pt-1 text-slate-700">
                <p className="font-semibold">{grievance.location?.locality || 'Locality'}</p>
                <p className="text-slate-500">
                  {grievance.location?.ward}, {grievance.location?.city} - {grievance.location?.pinCode}
                </p>
                {grievance.location?.landmark && (
                  <p className="text-[11px] text-slate-400">Landmark: {grievance.location.landmark}</p>
                )}
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          {grievance.attachments && grievance.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-slate-400" />
                Attached Evidence ({grievance.attachments.length})
              </h4>
              <div className="flex flex-wrap gap-3">
                {grievance.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white flex items-center gap-2 text-xs text-slate-700 transition-colors shadow-2xs"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium truncate max-w-[150px]">{att.name || `Photo_${idx + 1}`}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Citizen Resolution Actions (When status is RESOLVED) */}
          {grievance.status === 'RESOLVED' && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Field Officer Marked This Complaint as Resolved</span>
              </div>
              <p className="text-xs text-emerald-800">
                Please inspect the work in your locality and confirm satisfactory resolution, or reopen the ticket if the problem persists.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  id="confirm-resolution-btn"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Star className="w-4 h-4" />
                  Confirm Resolution & Rate
                </button>
                <button
                  id="reopen-grievance-btn"
                  onClick={() => setIsReopenModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reopen Issue (Not Fixed)
                </button>
              </div>
            </div>
          )}

          {/* Closed Banner */}
          {grievance.status === 'CLOSED' && (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Grievance successfully closed with citizen rating: <strong>{grievance.citizenRating || 5}/5 Stars</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Immutable Activity Timeline & Discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Activity History & Audit Timeline
          </h3>

          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {currentTimeline.length === 0 ? (
              <div className="relative pl-7 text-xs space-y-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute left-2 top-1 -translate-x-1/2 ring-4 ring-white" />
                <p className="font-bold text-slate-800">Grievance Submitted</p>
                <p className="text-slate-500 text-[11px]">Logged in municipal system with automatic ML dispatch.</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(grievance.submittedAt).toLocaleString('en-GB')}
                </p>
              </div>
            ) : (
              currentTimeline.map((item, idx) => (
                <div key={idx} className="relative pl-7 text-xs space-y-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute left-2 top-1 -translate-x-1/2 ring-4 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {item.activity_type || item.action || 'Activity Logged'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp || item.created_at || grievance.submittedAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.description || item.reason || item.content}</p>
                  <p className="text-[10px] text-slate-400">Actor: {item.actor_name || item.userName || 'Electricity Service Engine'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discussion / Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Citizen Notes & Municipal Responses
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {currentComments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No notes posted yet. You can add clarifications below.</p>
              ) : (
                currentComments.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {c.author_name || c.authorName || 'Officer/Citizen'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at || c.timestamp || Date.now()).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-slate-700">{c.comment || c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type an additional note or landmark clarification..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-hidden"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              Post
            </button>
          </form>
        </div>
      </div>

      {/* CONFIRM RESOLUTION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Confirm Satisfactory Resolution</h3>
            <p className="text-xs text-slate-600">
              Rate the speed and quality of resolution executed by the municipal engineering department.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Citizen Satisfaction Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-2 text-2xl focus:outline-hidden"
                  >
                    <span className={star <= rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Feedback Remarks (Optional)</label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience with the resolution crew..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolution}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
              >
                Confirm & Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-rose-900">Reopen Unresolved Grievance</h3>
            <p className="text-xs text-slate-600">
              Please state why the grievance was not resolved adequately. This will escalate the ticket directly to the supervisory engineer.
            </p>

            {reopenError && <p className="text-xs text-rose-600 font-bold">{reopenError}</p>}

            <textarea
              rows={4}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Water leak reappeared after 2 hours; road pothole was only partially filled with loose gravel..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-hidden"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700"
              >
                Submit Reopen Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="text-center border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">MUNICIPAL CORPORATION CITIZEN CHARTER</h2>
              <p className="text-[11px] text-slate-500">Official Grievance Registration Receipt</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Tracking Reference:</span>
                <span className="font-mono font-bold text-slate-900">{grievance.grievanceNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Citizen Name:</span>
                <span className="font-semibold text-slate-900">{grievance.citizenName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{grievance.finalCategoryName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Assigned Department:</span>
                <span className="font-semibold text-slate-900">{grievance.departmentName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Ward / Locality:</span>
                <span className="font-semibold text-slate-900">{grievance.location?.ward}, {grievance.location?.locality}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
