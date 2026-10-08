import React, { useState, useEffect, useRef } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import { detectDuplicateComplaint, assessPriority, predictCategory } from '../../ml/mlEngine.js';
import {
  FileText,
  MapPin,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  Cpu,
  CheckCircle,
  HelpCircle,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const SubmitGrievanceWizard = ({
  onSuccess,
  onCancel,
  onViewExisting
}) => {
  const { categories, grievances, submitGrievance, systemSettings, departments } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedResult, setSubmittedResult] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [consumerNumber, setConsumerNumber] = useState(currentUser?.consumerNumber || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Maharashtra electricity service-area fields.
  const [location, setLocation] = useState({
    state: 'Maharashtra',
    district: 'Pune',
    city: 'Pune',
    region: 'Pune Region',
    circle: 'Pune Urban Circle',
    division: 'Shivajinagar Division',
    subDivision: 'Shivajinagar Sub-Division',
    serviceArea: 'Shivajinagar 33kV Substation',
    locality: 'Shivajinagar Colony',
    landmark: 'Near Shivajinagar 33kV Substation',
    address: 'Lane 4, Shivajinagar Colony, Pune',
    pinCode: '411005'
  });

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  // Live ML Analysis
  const [livePrediction, setLivePrediction] = useState(null);
  const [isMLAnalyzing, setIsMLAnalyzing] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [livePriority, setLivePriority] = useState(null);

  const debounceTimerRef = useRef(null);

  // Debounced Live ML Inference calling Real Backend Classifier API
  useEffect(() => {
    if (title.trim().length >= 4 || description.trim().length >= 10) {
      setIsMLAnalyzing(true);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          // 1. Standalone ML Classification API
          const mlRes = await grievanceApi.classifyComplaint(
            title,
            description,
            systemSettings?.mlConfidenceThreshold || 0.75
          );

          if (mlRes) {
            setLivePrediction({
              categoryName: mlRes.predicted_category,
              confidence: mlRes.confidence,
              classificationStatus: mlRes.classification_status,
              modelVersion: mlRes.model_version || '1.0.0',
              probabilities: mlRes.probabilities || {},
              summary: mlRes.summary,
              safetyFlag: mlRes.safety_flag,
              safetyRiskLevel: mlRes.safety_risk_level,
              safetyReason: mlRes.safety_reason,
              detectedEntities: mlRes.detected_entities || {}
            });
          }
        } catch (err) {
          // Use the local electricity classifier if the backend is unavailable.
          const localPrediction = predictCategory(title, description);
          setLivePrediction({
            categoryName: localPrediction.categoryName,
            confidence: localPrediction.confidence,
            classificationStatus: 'LOCAL_FALLBACK',
            modelVersion: 'frontend-rule-model',
            summary: `${localPrediction.categoryName} complaint: ${description.trim()}`,
            safetyFlag: false,
            detectedEntities: {}
          });
        } finally {
          setIsMLAnalyzing(false);
        }

        // 2. Priority and Duplicate Analysis
        const prio = assessPriority(title, description, livePrediction?.categoryName || 'General Consumer Services');
        setLivePriority(prio);

        const dup = detectDuplicateComplaint(
          title,
          description,
          location.serviceArea,
          grievances,
          systemSettings?.duplicateSimilarityThreshold || 0.65
        );
        setDuplicateCheck(dup);
      }, 350);
    } else {
      setLivePrediction(null);
      setDuplicateCheck(null);
      setLivePriority(null);
      setIsMLAnalyzing(false);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [title, description, location.serviceArea, grievances, systemSettings]);

  // Handle Evidence Upload
  const handleFileUpload = (e) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size exceeds 5MB limit. Please upload a smaller file.');
        continue;
      }

      const mockUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80';

      newAttachments.push({
        id: `att_${Date.now()}_${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: mockUrl,
        uploadedAt: new Date().toISOString()
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Step Validation
  const isStep1Valid = title.trim().length >= 4 && description.trim().length >= 10 && consumerNumber.trim().length >= 6;
  const isStep2Valid = location.city.trim().length > 0 && location.serviceArea.trim().length > 0 && location.locality.trim().length > 0;

  // Submit Handler
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const result = await submitGrievance({
        title,
        description,
        selectedCategoryId: selectedCategoryId || undefined,
        selectedCategoryName: selectedCat?.name,
        consumerNumber,
        location,
        attachments,
        priority: livePriority?.priority || 'MEDIUM'
      });

      setSubmittedResult(result);
      setIsSubmitting(false);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit grievance. Please verify details and retry.');
      setIsSubmitting(false);
    }
  };

  // Post-submission success confirmation view
  if (submittedResult) {
    const grv = submittedResult.grievance;
    const routing = submittedResult.routing;
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
            Ticket ID: {grv.grievanceNumber}
          </span>
          <h2 className="text-2xl font-bold text-slate-900">{t('submissionSuccess')}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your electricity complaint has been registered and automatically routed to the relevant service department.
          </p>
        </div>

        {/* AI & Routing Confirmation Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-semibold text-slate-600">AI Predicted Category</span>
            <span className="font-bold text-blue-700">{grv.finalCategoryName}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-semibold text-slate-600">Assigned Department</span>
            <span className="font-bold text-slate-800">{grv.departmentName}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-semibold text-slate-600">Responsible Engineer</span>
            <span className="font-bold text-slate-800">{grv.assignedOfficerName || 'Field Service Officer'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Initial Status</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
              {grv.status}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onSuccess(grv.id)}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Track Grievance Status
          </button>
          <button
            onClick={() => {
              setSubmittedResult(null);
              setTitle('');
              setDescription('');
              setAttachments([]);
              setStep(1);
            }}
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Submit Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden" id="submit-grievance-wizard">
      {/* Wizard Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-6 text-white">
        <h2 className="text-xl font-bold">{t('submitNewGrievance')}</h2>
        <p className="text-xs text-blue-100 mt-1">
          {t('republicIndia')} • Step {step} of 4
        </p>

        {/* Stepper Navigation */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-white' : 'bg-white/30'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 4 ? 'bg-white' : 'bg-white/30'}`} />
        </div>

        <div className="flex justify-between text-[11px] font-semibold mt-2 text-blue-200">
          <span className={step === 1 ? 'text-white font-bold' : ''}>1. Issue Details</span>
          <span className={step === 2 ? 'text-white font-bold' : ''}>2. Location</span>
          <span className={step === 3 ? 'text-white font-bold' : ''}>3. Evidence</span>
          <span className={step === 4 ? 'text-white font-bold' : ''}>4. Review & AI</span>
        </div>
      </div>

      {/* Wizard Content Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {submitError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        {livePriority && (
          <div className={`mt-3 rounded-lg border p-3 text-xs ${livePriority.priority === 'CRITICAL' ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              Priority preview: {livePriority.priority}
            </div>
            <p className="mt-1">{livePriority.reason}</p>
          </div>
        )}

        {/* STEP 1: Issue Details & Live AI Prediction */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('complaintTitle')} <span className="text-red-500">*</span>
              </label>
              <input
                id="grievance-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('complaintTitlePlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">Minimum 4 characters summarizing the electricity issue.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                MSEDCL Consumer Number <span className="text-red-500">*</span>
              </label>
              <input
                id="consumer-number-input"
                type="text"
                value={consumerNumber}
                onChange={(e) => setConsumerNumber(e.target.value)}
                placeholder="e.g. 270019284102"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('complaintDescription')} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="grievance-description-input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('complaintDescriptionPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Provide specific location cues, duration, and safety hazards to ensure accurate AI classification.
              </p>
            </div>

            {/* Optional Manual Category Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('categoryOptional')}
              </label>
              <select
                id="grievance-category-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-600 outline-hidden"
              >
                <option value="">-- Let AI Auto-Detect (Recommended) --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Real-time ML Prediction Card */}
            {(isMLAnalyzing || livePrediction) && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">
                      Real-time Electricity Complaint Analysis
                    </span>
                  </div>
                  {isMLAnalyzing ? (
                    <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                      Analyzing complaint text...
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {(livePrediction?.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  )}
                </div>

                {livePrediction && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Detected Electricity Category</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{livePrediction.categoryName}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Dispatch Routing Mode</span>
                      <span className="font-bold text-indigo-700 mt-0.5 block">
                        {livePrediction.confidence >= (systemSettings?.mlConfidenceThreshold || 0.75)
                          ? 'Automatic Direct Dispatch'
                          : 'Service Department Review'}
                      </span>
                    </div>
                  </div>
                )}
                {livePrediction?.summary && (
                  <p className="mt-3 text-[11px] text-slate-700">
                    <strong>Summary:</strong> {livePrediction.summary}
                  </p>
                )}
                {livePrediction?.safetyFlag && (
                  <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                    <strong>Safety warning:</strong> {livePrediction.safetyReason || 'Electrical hazard detected. Keep away and await emergency response.'}
                  </div>
                )}
                {Object.keys(livePrediction?.detectedEntities || {}).length > 0 && (
                  <div className="mt-3 text-[11px] text-slate-600">
                    <strong>Detected electrical details:</strong>{' '}
                    {Object.entries(livePrediction.detectedEntities).map(([key, values]) => `${key}: ${values.join(', ')}`).join(' • ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Service Area & Address */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={location.region}
                  onChange={(e) => setLocation({ ...location, region: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Circle</label>
                <input
                  type="text"
                  value={location.circle}
                  onChange={(e) => setLocation({ ...location, circle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Division</label>
                <input
                  type="text"
                  value={location.division}
                  onChange={(e) => setLocation({ ...location, division: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Service Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location.serviceArea}
                  onChange={(e) => setLocation({ ...location, serviceArea: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder="e.g. Shivajinagar 33kV Substation"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('locality')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location.locality}
                onChange={(e) => setLocation({ ...location, locality: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                placeholder={t('localityPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">{t('landmark')}</label>
                <input
                  type="text"
                  value={location.landmark}
                  onChange={(e) => setLocation({ ...location, landmark: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder={t('landmarkPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">{t('pinCode')}</label>
                <input
                  type="text"
                  maxLength={6}
                  value={location.pinCode}
                  onChange={(e) => setLocation({ ...location, pinCode: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder={t('pinCodePlaceholder')}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Evidence Upload */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600">{t('evidenceNotice')}</p>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">{t('dragDropText')}</p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="mt-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {uploadError && (
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {uploadError}
              </p>
            )}

            {/* Attachments List Preview */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-700">Uploaded Evidence ({attachments.length}):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-800 truncate">{att.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review Summary & Duplicate Check */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Duplicate Ticket Warning */}
            {duplicateCheck?.hasDuplicate && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{t('aiDuplicateWarning')}</span>
                </div>
                <p className="text-amber-800">{t('aiDuplicateMsg')}</p>
                <button
                  onClick={() => onViewExisting(duplicateCheck.similarGrievanceId)}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[11px]"
                >
                  {t('viewSimilarTicket')} ({duplicateCheck.similarGrievanceId})
                </button>
              </div>
            )}

            {/* Submission Summary Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                {t('reviewSummary')}
              </h3>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Title</span>
                <p className="font-bold text-slate-800 mt-0.5">{title}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Description</span>
                <p className="text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">{description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Consumer Number</span>
                  <p className="font-medium text-slate-800 mt-0.5">{consumerNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Location</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {location.locality}, {location.serviceArea}, {location.city} - {location.pinCode}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">AI Routing Preview</span>
                  <p className="font-bold text-blue-700 mt-0.5">
                    {livePrediction?.categoryName || 'General Consumer Services'}
                  </p>
                </div>
              </div>
              {livePriority && (
                <div className={`rounded-lg border p-3 text-xs ${livePriority.priority === 'CRITICAL' ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <span className="font-bold">Priority: {livePriority.priority}</span>
                  <span className="ml-2">{livePriority.reason}</span>
                </div>
              )}
              {livePriority?.priority === 'CRITICAL' && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Electrical safety warning:</strong> Keep away from the hazard and do not touch wires, poles, or equipment. The complaint will be routed for urgent response.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Controls Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="confirm-submit-grievance-btn"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Electricity Service Desk...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('submitGrievanceBtn')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
