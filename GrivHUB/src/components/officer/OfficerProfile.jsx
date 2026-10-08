import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  ShieldCheck,
  Briefcase,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const OfficerProfile = () => {
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const { departments, updateOfficerProfile, updateOfficerAvailability } = useGrievance();

  const [email, setEmail] = useState(currentUser.email || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [availability, setAvailability] = useState(currentUser.availabilityStatus || 'AVAILABLE');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const dept = departments.find(
    (d) => d.id === currentUser.departmentId || d.department_id === currentUser.departmentId
  );

  useEffect(() => {
    setEmail(currentUser.email || '');
    setMobile(currentUser.mobile || '');
    setAvailability(currentUser.availabilityStatus || 'AVAILABLE');
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      // 1. Update contact info & availability in backend
      await updateOfficerProfile(currentUser.id, {
        email: email.trim(),
        phone: mobile.trim(),
        availability_status: availability
      });

      // 2. Update local auth context
      updateCurrentUserProfile({
        email: email.trim(),
        mobile: mobile.trim(),
        availabilityStatus: availability
      });

      setFeedback({
        type: 'success',
        message: 'Officer profile & availability updated successfully in municipal records.'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const jurisdictions = currentUser.jurisdiction || ['Shivajinagar Service Area', 'Kothrud Service Area', 'Pimpri Service Area'];

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="officer-profile-page">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Electricity Officer Profile & Credentials</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your departmental designation, field contact records, and routing availability
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Officer Card / Badge */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center border-2 border-blue-200 shadow-inner">
            {currentUser.fullName
              ? currentUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : 'OF'}
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">{currentUser.fullName}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser.designation || 'Field Execution Officer'}
            </p>
            <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified Officer</span>
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 space-y-2.5 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Officer ID</span>
              <span className="font-mono font-bold text-slate-700">{currentUser.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Department</span>
              <span className="font-medium text-slate-700 truncate max-w-[150px]">
                {dept?.name || 'Municipal Works'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Capacity</span>
              <span className="font-bold text-slate-700">{currentUser.maxWorkload || 15} Tasks</span>
            </div>
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Official Contact & Status Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile / Field Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Availability Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Automated Routing Availability
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                The automated ML routing engine skips officers marked as Unavailable or On Leave.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'AVAILABLE', label: 'Available', desc: 'Accepting new dispatches' },
                  { id: 'BUSY', label: 'Busy', desc: 'Near workload threshold' },
                  { id: 'UNAVAILABLE', label: 'Unavailable', desc: 'Temporary field duty' },
                  { id: 'ON_LEAVE', label: 'On Leave', desc: 'Reroutes incoming' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAvailability(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      availability === item.id
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Jurisdiction Details */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Assigned Municipal Jurisdictions</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {jurisdictions.map((j, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    {j}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Ward assignments are managed by the Municipal Administrator.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Updates'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
