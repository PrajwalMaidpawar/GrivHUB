import React from 'react';
import { Modal } from './Modal.jsx';
import { INITIAL_ML_MODEL_STATUS, DATASET_PIPELINE_SPECIFICATION } from '../../ml/datasetPipelineInfo.js';
import { Database, AlertCircle, Cpu, FileSpreadsheet } from 'lucide-react';

export const DatasetInfoModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ML Training Pipeline & Technical Specifications"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">
        {/* Model Status Card - Real State */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Database className="w-4 h-4" />
              <span>{INITIAL_ML_MODEL_STATUS.modelName}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Status: {INITIAL_ML_MODEL_STATUS.status}
            </span>
          </div>
          <p className="text-slate-300 text-xs">{INITIAL_ML_MODEL_STATUS.statusMessage}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-400 block">Training Samples:</span>
              <span className="font-bold text-white">0 (Awaiting Dataset)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Split Ratio:</span>
              <span className="font-bold text-white">70% Train / 15% Val / 15% Test</span>
            </div>
            <div>
              <span className="text-slate-400 block">Configured Chunk Size:</span>
              <span className="font-bold text-white">{DATASET_PIPELINE_SPECIFICATION.configuredChunkSize.toLocaleString()} rows</span>
            </div>
            <div>
              <span className="text-slate-400 block">Model Metrics:</span>
              <span className="font-bold text-amber-400">Pending Execution</span>
            </div>
          </div>
        </div>

        {/* Pipeline Info Notice */}
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-900 leading-relaxed">
            <p className="font-bold">Transparent Engineering Protocol:</p>
            <p className="mt-0.5 text-blue-800">
              The GrievanceHUB architecture utilizes a verifiable data ingestion pipeline. No synthetic test accuracies or hardcoded performance matrices are displayed until the offline training script executes against real verified CSV/JSON corpora.
            </p>
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-700" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Standard Civic Classification Taxonomy (8 Categories)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {DATASET_PIPELINE_SPECIFICATION.targetCategories.map((cat, idx) => (
              <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-medium text-slate-800">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Engineering & Preprocessing */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Offline Pipeline Architecture & Verification Stages
            </h4>
          </div>
          <ol className="space-y-1.5 list-decimal pl-4 text-slate-600 text-[11px]">
            {DATASET_PIPELINE_SPECIFICATION.pipelineSteps.map((step, idx) => (
              <li key={idx}>
                <span className="text-slate-800 font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            Close Dataset Specs
          </button>
        </div>
      </div>
    </Modal>
  );
};
