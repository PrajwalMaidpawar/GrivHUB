import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Edit2,
  ArrowRight,
  TrendingUp,
  Brain,
  Sliders
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminClassificationReview = ({
  onViewGrievance
}) => {
  const { grievances, refreshGrievances } = useGrievance();
  const [filterConfidence, setFilterConfidence] = useState('LOW'); // 'LOW', 'ALL', 'CORRECTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  const CATEGORIES = [
    'Pothole',
    'Garbage',
    'Streetlight',
    'Water Supply',
    'Drainage',
    'Traffic',
    'Encroachment'
  ];

  const handleCorrectCategory = async (e) => {
    e.preventDefault();
    if (!selectedGrievance || !overrideCategory) return;

    try {
      setSubmitting(true);
      const gid = selectedGrievance.id || selectedGrievance.grievance_id;
      await grievanceApi.correctCategory(
        gid,
        overrideCategory,
        overrideReason || 'Administrative ML classification review override.'
      );

      setFeedbackSuccess(`Category for ${gid} successfully updated to ${overrideCategory}.`);
      setSelectedGrievance(null);
      setOverrideCategory('');
      setOverrideReason('');
      await refreshGrievances();
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err) {
      console.error('Failed to override category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = grievances.filter((g) => {
    const aiConf = g.aiPrediction?.confidence ?? g.confidence ?? 0.85;
    const isLow = aiConf < 0.70;
    const isCorrected = !!(g.categoryCorrection || g.category_correction);

    if (filterConfidence === 'LOW' && !isLow) return false;
    if (filterConfidence === 'CORRECTED' && !isCorrected) return false;

    const q = searchQuery.toLowerCase();
    const gid = (g.id || g.grievance_id || '').toLowerCase();
    const title = (g.title || '').toLowerCase();
    const desc = (g.description || '').toLowerCase();

    return gid.includes(q) || title.includes(q) || desc.includes(q);
  });

  const lowConfidenceCount = grievances.filter((g) => (g.aiPrediction?.confidence ?? 0.85) < 0.70).length;
  const correctedCount = grievances.filter((g) => !!g.categoryCorrection).length;

  return (
    <div className="space-y-6" id="admin-classification-review-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold mb-1">
            <Brain className="w-3.5 h-3.5" />
            <span>AI Quality Assurance & Active Learning</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI Classification Review & Oversight</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit low-confidence predictions, review officer corrections, and maintain classifier accuracy.
          </p>
        </div>

        <button
          onClick={refreshGrievances}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {feedbackSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterConfidence('LOW')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterConfidence === 'LOW'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Low Confidence Flags (&lt;70%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-2">{lowConfidenceCount}</div>
          <div className="text-[11px] text-rose-600 mt-1">Requiring manual verification</div>
        </div>

        <div
          onClick={() => setFilterConfidence('CORRECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterConfidence === 'CORRECTED'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Officer Corrections</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">{correctedCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Logged for model fine-tuning</div>
        </div>

        <div
          onClick={() => setFilterConfidence('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterConfidence === 'ALL'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase">All Classified Grievances</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-900 mt-2">{grievances.length}</div>
          <div className="text-[11px] text-indigo-600 mt-1">Overall classification history</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search complaint text, ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterConfidence('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterConfidence === 'LOW'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Low Confidence ({lowConfidenceCount})
          </button>
          <button
            onClick={() => setFilterConfidence('CORRECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterConfidence === 'CORRECTED'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Corrected ({correctedCount})
          </button>
          <button
            onClick={() => setFilterConfidence('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterConfidence === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Review Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-slate-800">No items match the active review filter</p>
          <p className="text-xs text-slate-400 mt-1">All AI predictions are verified or within standard confidence thresholds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const gid = g.id || g.grievance_id;
            const pred = g.aiPrediction || {};
            const confidence = pred.confidence ?? 0.85;
            const isLow = confidence < 0.70;
            const predictedCategory = pred.predictedCategory || g.category;
            const finalCategory = g.finalCategoryName || g.category;
            const isCorrected = predictedCategory !== finalCategory;

            return (
              <div key={gid} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-300 transition space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">{gid}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {Math.round(confidence * 100)}% Confidence
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2">{g.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    "{g.description}"
                  </p>

                  <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">AI Predicted:</span>
                      <span className="font-bold text-slate-800">{predictedCategory}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Assigned Category:</span>
                      <span className="font-bold text-indigo-700">{finalCategory}</span>
                    </div>

                    {isCorrected && (
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-700">
                        <strong>Correction Note:</strong> {g.categoryCorrection?.reason || 'Manually adjusted by municipal officer'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onViewGrievance(gid)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View Full Details
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGrievance(g);
                      setOverrideCategory(finalCategory);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Override / Confirm Category</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      {selectedGrievance && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedGrievance(null)}
          title="Confirm / Override AI Classification"
        >
          <form onSubmit={handleCorrectCategory} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedGrievance.title}</div>
              <div className="text-slate-600 italic">"{selectedGrievance.description}"</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Category *</label>
              <select
                required
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Override Reason / Justification *</label>
              <textarea
                required
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="State why this classification is being confirmed or corrected..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedGrievance(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !overrideCategory}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Classification'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminClassificationReview;
