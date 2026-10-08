import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import {
  Globe,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const ArchitectureGuideModal = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GrievanceHUB - System Architecture & Technical Specifications"
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Sub-nav tabs */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('ml-pipeline')}
            className={`pb-2 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'ml-pipeline'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ML & NLP Pipeline
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-2 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'architecture'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Architecture & Database
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-2 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Role-Based Access (RBAC)
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 leading-relaxed">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
              <h4 className="font-bold text-sm text-blue-900 mb-1">
                GrievanceHUB: AI-Powered Civic Grievance Management
              </h4>
              <p>
                Engineered specifically for Indian Municipal Corporations, GrievanceHUB streamlines the entire civic issue lifecycle from citizen reporting to on-site field engineer resolution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Globe className="w-5 h-5 text-blue-600 mb-1.5" />
                <h5 className="font-bold text-slate-800">Multilingual Ingestion</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Full support for English, हिन्दी, and मराठी with instant runtime language switching.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-purple-600 mb-1.5" />
                <h5 className="font-bold text-slate-800">ML Auto-Dispatch</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Heuristic & TF-IDF similarity models for classification and auto-routing of complaints.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1.5" />
                <h5 className="font-bold text-slate-800">Citizen Verification</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  5-star satisfaction rating and 7-day reopen window to ensure genuine resolution quality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ML & NLP PIPELINE */}
        {activeTab === 'ml-pipeline' && (
          <div className="space-y-4 leading-relaxed">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400">ML Classification Pipeline Architecture</span>
                <span className="text-[10px] font-mono text-slate-400">Offline Python Pipeline + Client-side Ingestion</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300">
                <li>
                  <strong className="text-white">Text Preprocessing:</strong> Tokenization, punctuation removal, case normalization, and multilingual Indian stop-word filtering.
                </li>
                <li>
                  <strong className="text-white">Feature Extraction:</strong> Sublinear TF-IDF n-gram vectorizer (unigrams + bigrams) spanning 8 civic domain categories.
                </li>
                <li>
                  <strong className="text-white">Classification:</strong> Multi-class logistic regression / Naive Bayes with calibrated probability thresholds.
                </li>
                <li>
                  <strong className="text-white">Duplicate Detection:</strong> Cosine text similarity calculation constrained by municipal ward boundaries.
                </li>
                <li>
                  <strong className="text-white">Smart Officer Load-Balancing:</strong> Auto-assigns to available engineer within target department with lowest active workload.
                </li>
              </ol>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
              <h5 className="font-bold">Human-in-the-Loop Active Retraining</h5>
              <p className="text-[11px] mt-1">
                When field officers correct AI category misclassifications, each feedback instance is saved with reasoning and exported for batch fine-tuning.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: ARCHITECTURE & DATABASE */}
        {activeTab === 'architecture' && (
          <div className="space-y-4 leading-relaxed">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Frontend & Technical Architecture</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• <strong>Frontend:</strong> React 19 + JavaScript (ES6+) + Vite + Tailwind CSS + Lucide Icons + Recharts</li>
                <li>• <strong>State & Localization:</strong> React Context Provider + Custom i18n Dictionary Engine (EN, HI, MR)</li>
                <li>• <strong>ML Engine:</strong> Embedded Local TF-IDF Classifier + Duplicate Engine</li>
                <li>• <strong>Persistence:</strong> Local Storage state cache with schema specifications ready for relational database binding.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: ROLES */}
        {activeTab === 'roles' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <h5 className="font-bold text-emerald-900">Citizen Persona (e.g. Ramesh Kulkarni)</h5>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Submit grievances, view live AI prediction & duplicate alerts, attach photo evidence, track 6-stage lifecycle, confirm resolution with 5-star rating, or reopen within 7 days.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
              <h5 className="font-bold text-blue-900">Officer Persona (e.g. Er. Rajesh Patil - Water Dept)</h5>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Inspect assigned field queue, monitor workload capacity, log field inspection notes, mark resolved with proof, or submit Human-in-the-Loop AI category corrections.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
              <h5 className="font-bold text-purple-900">Admin / Commissioner Persona (e.g. Dr. Anand Shelar IAS)</h5>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Executive dashboard with Recharts visualizations, global grievance repo, manual officer reallocation, emergency escalation, ML performance management, threshold configuration, and feedback review.
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
};
