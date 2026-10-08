/**
 * Real-world ML model metadata status handler.
 * Does NOT contain fabricated metrics or simulated statistics.
 * Initial state is explicitly NOT_TRAINED until real training pipeline completes.
 */

export const INITIAL_ML_MODEL_STATUS = {
  status: 'NOT_TRAINED',
  isTrained: false,
  statusMessage: 'Model Training Pipeline Not Completed',
  modelName: 'GrievanceHUB Classifier',
  version: 'N/A',
  algorithm: 'N/A (Pending Offline Training)',
  trainingDate: 'Not Available',
  totalTrainingSamples: 0,
  datasetName: 'Not Configured',
  datasetSource: 'Pending Verified Dataset Selection',
  accuracy: null,
  macroF1Score: null,
  weightedF1Score: null,
  precision: null,
  recall: null,
  confusionMatrix: null,
  perClassMetrics: [],
  supportedCategories: [
    'Power Outage / No Supply',
    'Voltage Fluctuation / Low Voltage',
    'Meter Issues',
    'Billing and Payment',
    'Transformer Fault',
    'Pole / Wire / Electrical Hazard',
    'New Connection / Service Request',
    'Street/Public Electrical Infrastructure',
    'Power Theft / Unauthorized Connection',
    'General Consumer Services'
  ]
};

export const DATASET_PIPELINE_SPECIFICATION = {
  configuredChunkSize: 50000,
  status: 'AWAITING_DATASET',
  targetCategories: [
    '1. Power Outage / No Supply',
    '2. Voltage Fluctuation / Low Voltage',
    '3. Meter Issues',
    '4. Billing and Payment',
    '5. Transformer Fault',
    '6. Pole / Wire / Electrical Hazard',
    '7. New Connection / Service Request',
    '8. Street/Public Electrical Infrastructure',
    '9. Power Theft / Unauthorized Connection',
    '10. General Consumer Services'
  ],
  pipelineSteps: [
    '1. Raw Electricity Complaint Dataset Schema Inspection & Column Selection',
    '2. Chunk Processing with Configurable Memory Bounds',
    '3. PII Detection & Anonymization Logging',
    '4. Text Cleaning & Normalization',
    '5. Category Harmonization to 10 MSEDCL Electricity Service Classes',
    '6. Deduplication Analysis',
    '7. Stratified 70/15/15 Splitting (Random State 42)',
    '8. Model Comparison (Multinomial Naive Bayes, Logistic Regression, Linear SVM / Calibrated)',
    '9. Joblib Artifact Serialization & Model Metadata Export'
  ]
};
