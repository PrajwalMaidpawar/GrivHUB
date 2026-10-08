import React, { useState } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { predictCategory, assessPriority } from '../../ml/mlEngine.js';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  BrainCircuit,
  FlaskConical,
  BookOpen
} from 'lucide-react';

export const AdminMLPerformance = ({ onOpenDatasetInfo }) => {
  const {
    mlModelMetrics,
    aiFeedbackLogs,
    systemSettings,
    updateSettings
  } = useGrievance();
  const { t } = useI18n();

  // ML Playground State
  const [testTitle, setTestTitle] = useState('Deep pothole on main road causing vehicle skidding');
  const [testDesc, setTestDesc] = useState('Severe road damage and broken asphalt near Shivaji Nagar signal. Water accumulation makes it very hazardous for two-wheelers.');
  const [testResult, setTestResult] = useState(null);
  const [testPriority, setTestPriority] = useState(null);

  // Retraining Simulation State
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  const runPlaygroundInference = () => {
    if (!testTitle.trim() && !testDesc.trim()) return;
    const pred = predictCategory(testTitle, testDesc, systemSettings.mlConfidenceThreshold);
    const prio = assessPriority(testTitle, testDesc, pred.categoryName);
    setTestResult(pred);
    setTestPriority(prio);
  };

  const handleSimulateRetraining = () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    setTimeout(() => {
      setIsRetraining(false);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 5000);
    }, 1800);
  };

  // Sample prompt pre-fills
  const samplePrompts = [
    {
      lang: 'English',
      title: 'Water pipe burst with low pressure',
      desc: 'Main drinking water pipeline is leaking heavily on Sector 4 road, completely disrupting tap supply to 50 houses.'
    },
    {
      lang: 'Hindi',
      title: 'सड़क पर भारी कचरे का ढेर और दुर्गंध',
      desc: 'वार्ड 12 में पिछले चार दिनों से कचरा गाड़ी नहीं आई है। सड़क किनारे भारी बदबू और मक्खियाँ फैल रही हैं।'
    },
    {
      lang: 'Marathi',
      title: 'रस्त्यावरील पथदिवे बंद आहेत',
      desc: 'मुख्य चौकातील सर्व स्ट्रीट लाईट गेल्या आठवड्यापासून बंद आहेत, रात्रीच्या वेळी अपघाताचा धोका निर्माण झाला आहे.'
    }
  ];

  return (
    <div className="space-y-6" id="admin-ml-performance-view">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300 border border-indigo-400/30 mb-2">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Machine Learning & NLP Architecture</span>
          </div>
          <h1 className="text-2xl font-bold">{mlModelMetrics.modelName}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {mlModelMetrics.modelNotes || 'Machine Learning pipeline with TF-IDF and Naive Bayes architecture. Configurable for automated category classification, duplicate detection, and intelligent dispatch.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenDatasetInfo}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-blue-300" />
            Dataset & Pipeline Info
          </button>
          <button
            onClick={handleSimulateRetraining}
            disabled={isRetraining}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetraining ? 'animate-spin' : ''}`} />
            {isRetraining ? 'Retraining Model...' : 'Simulate Model Retraining'}
          </button>
        </div>
      </div>

      {retrainSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Retraining Triggered!</strong> Model pipeline initiated with {aiFeedbackLogs.length} verified officer corrections queued for local TF-IDF vocabulary weights.
          </span>
        </div>
      )}

      {/* Model Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('accuracy')}</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {mlModelMetrics.isTrained ? `${(mlModelMetrics.accuracy * 100).toFixed(1)}%` : 'Not Trained'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cross-validation test split</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('precision')}</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {mlModelMetrics.isTrained ? `${(mlModelMetrics.precision * 100).toFixed(1)}%` : 'Not Trained'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Weighted macro-average</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('recall')}</span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {mlModelMetrics.isTrained ? `${(mlModelMetrics.recall * 100).toFixed(1)}%` : 'Not Trained'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">True positive coverage</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('f1Score')}</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {mlModelMetrics.isTrained ? mlModelMetrics.weightedF1Score.toFixed(3) : 'Not Trained'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Harmonic mean balance</span>
        </div>
      </div>

      {/* Per-Category Accuracy Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Per-Category Evaluation Matrix</h2>
            <p className="text-xs text-slate-500">Fine-grained validation scores across municipal divisions</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {mlModelMetrics.isTrained ? `Total Samples: ${mlModelMetrics.totalTrainingSamples.toLocaleString()}` : 'Status: Pipeline Initialized'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-4 py-3">Precision</th>
                <th className="px-4 py-3">Recall</th>
                <th className="px-4 py-3">F1-Score</th>
                <th className="px-6 py-3 text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mlModelMetrics.perClassMetrics && mlModelMetrics.perClassMetrics.length > 0 ? (
                mlModelMetrics.perClassMetrics.map((row) => (
                  <tr key={row.categoryName} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-slate-800">{row.categoryName}</td>
                    <td className="px-4 py-3.5 font-mono text-purple-700">
                      {mlModelMetrics.isTrained ? `${(row.precision * 100).toFixed(1)}%` : 'Not Trained'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-indigo-700">
                      {mlModelMetrics.isTrained ? `${(row.recall * 100).toFixed(1)}%` : 'Not Trained'}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                      {mlModelMetrics.isTrained ? row.f1Score.toFixed(3) : 'Not Trained'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-500">
                      {mlModelMetrics.isTrained ? `${row.support.toLocaleString()} samples` : 'Awaiting data'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    Pipeline awaiting dataset training execution. Evaluation matrix will populate upon baseline model run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive ML Inference Tester & Hyperparameter Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Inference Playground */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Multilingual Inference Playground</h2>
            </div>
            <span className="text-[11px] text-slate-400">Live NLP Engine</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block mb-1">Quick Sample Prompts:</span>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTestTitle(s.title);
                      setTestDesc(s.desc);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors"
                  >
                    {s.lang}: {s.title.substring(0, 20)}...
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <button
              onClick={runPlaygroundInference}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Run Inference
            </button>
          </div>

          {/* Test Results Output */}
          {testResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400">Prediction Output</span>
                <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">
                  {Math.round(testResult.confidence * 100)}% Confidence
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Predicted Category:</span>
                  <span className="font-bold text-white">{testResult.categoryName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Department:</span>
                  <span className="font-bold text-indigo-300">{testResult.departmentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Calculated Priority:</span>
                  <span className="font-bold text-amber-300">{testPriority?.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Auto-Route Decision:</span>
                  <span className="font-bold text-emerald-300">
                    {testResult.confidence >= systemSettings.mlConfidenceThreshold ? 'ELIGIBLE' : 'MANUAL REVIEW'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hyperparameters & System Thresholds */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-800">Operational Thresholds & Guardrails</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Auto-Dispatch Confidence Threshold</span>
                <span className="text-indigo-600 font-mono">
                  {Math.round(systemSettings.mlConfidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={systemSettings.mlConfidenceThreshold}
                onChange={(e) =>
                  updateSettings({ mlConfidenceThreshold: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Grievances with confidence score above this percentage automatically bypass manual dispatch.
              </p>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Duplicate Detection Similarity Threshold</span>
                <span className="text-indigo-600 font-mono">
                  {Math.round(systemSettings.duplicateSimilarityThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={systemSettings.duplicateSimilarityThreshold}
                onChange={(e) =>
                  updateSettings({ duplicateSimilarityThreshold: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cosine word-overlap cutoff to warn citizens about matching open issues in the same ward.
              </p>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Citizen Reopen Window (Days)</span>
                <span className="text-indigo-600 font-mono">
                  {systemSettings.reopenWindowDays} Days
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="14"
                step="1"
                value={systemSettings.reopenWindowDays}
                onChange={(e) =>
                  updateSettings({ reopenWindowDays: parseInt(e.target.value, 10) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Timeframe after ticket resolution during which a citizen can reopen if unsatisfactory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Feedback Audit Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Human-in-the-Loop Feedback Dataset ({aiFeedbackLogs.length} Records)
            </h2>
            <p className="text-xs text-slate-500">
              Officer field corrections utilized for continuous offline active learning and model retraining
            </p>
          </div>
        </div>

        {aiFeedbackLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No corrections logged yet. When field officers correct AI predictions in their portal, records populate here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Grievance Number</th>
                  <th className="px-4 py-3">AI Prediction</th>
                  <th className="px-4 py-3">Human Corrected Category</th>
                  <th className="px-4 py-3">Officer Name</th>
                  <th className="px-6 py-3">Field Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aiFeedbackLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-mono font-bold text-blue-700">{log.grievanceNumber}</td>
                    <td className="px-4 py-3.5 text-rose-600 font-medium">{log.originalPredictedCategoryName}</td>
                    <td className="px-4 py-3.5 text-emerald-700 font-bold">{log.correctedCategoryName}</td>
                    <td className="px-4 py-3.5 text-slate-700">{log.officerName}</td>
                    <td className="px-6 py-3.5 text-slate-600 italic">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
