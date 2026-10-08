import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Zap,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Award
} from 'lucide-react';
import { StaffVerifyModal } from './StaffVerifyModal.jsx';

export const OfficerRegistrationPage = ({ onSwitchToStaffLogin, onRegistrationComplete }) => {
  const { registerStaff } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    employeeId: '',
    designation: 'Junior Engineer (JE)',
    department: 'POWER_SUPPLY',
    region: 'Pune Zone',
    circle: 'Pune Urban',
    division: 'Shivajinagar',
    subdivision: 'Model Colony',
    section: 'FC Road Branch',
    officeName: 'Model Colony Sub-Division Office',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter an authorized official email address.');
      return;
    }
    if (!formData.employeeId.trim()) {
      setErrorMessage('Employee ID is required.');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setErrorMessage('Official mobile number is required.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!formData.termsAccepted) {
      setErrorMessage('You must confirm that you are an authorized MSEDCL staff member.');
      return;
    }

    setIsLoading(true);
    const result = await registerStaff({
      full_name: formData.fullName.trim(),
      email: formData.email.trim(),
      mobile_number: formData.mobileNumber.trim(),
      employee_id: formData.employeeId.trim().toUpperCase(),
      designation: formData.designation,
      department: formData.department,
      region: formData.region.trim(),
      circle: formData.circle.trim(),
      division: formData.division.trim(),
      subdivision: formData.subdivision.trim(),
      section: formData.section.trim(),
      office_name: formData.officeName.trim(),
      password: formData.password,
      confirm_password: formData.confirmPassword,
      terms_accepted: formData.termsAccepted
    });
    setIsLoading(false);

    if (result.success) {
      setRegisteredEmail(formData.email.trim());
      setIsVerifyModalOpen(true);
    } else {
      setErrorMessage(result.error || 'Failed to submit staff registration.');
    }
  };

  const handleVerifySuccess = (result) => {
    setIsVerifyModalOpen(false);
    if (onRegistrationComplete) {
      onRegistrationComplete({
        employeeId: formData.employeeId.trim().toUpperCase(),
        email: formData.email.trim()
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-3xl mx-auto z-10 relative">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onSwitchToStaffLogin}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Staff Sign In</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">GrievanceHUB</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              STAFF ONBOARDING
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-blue-600 mb-1">
              <Briefcase className="w-5 h-5" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">MSEDCL Staff Account Registration</h1>
            </div>
            <p className="text-xs text-slate-500">
              Official staff onboarding for field engineers, substation operators, and departmental officers.
            </p>

            {/* Security Warning Notice */}
            <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                Staff accounts require organizational identity verification and administrator approval before access is provisioned.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Employee Identity & Contact */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <span>1. Personal & Contact Details</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh V. Kulkarni"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. ramesh.k@msedcl.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Mobile (10-Digit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    required
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    required
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="e.g. EMP-PUN-1042"
                    className="w-full uppercase font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Organizational Hierarchy */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <span>2. Organizational Posting & Hierarchy</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Junior Engineer (JE)">Junior Engineer (JE)</option>
                    <option value="Assistant Engineer (AE)">Assistant Engineer (AE)</option>
                    <option value="Executive Engineer (EE)">Executive Engineer (EE)</option>
                    <option value="Superintending Engineer (SE)">Superintending Engineer (SE)</option>
                    <option value="Chief Engineer (CE)">Chief Engineer (CE)</option>
                    <option value="Sub-Station Operator (SSO)">Sub-Station Operator (SSO)</option>
                    <option value="Line Staff / Technician">Line Staff / Technician</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="POWER_SUPPLY">POWER_SUPPLY (Power Supply & Outages)</option>
                    <option value="METERING">METERING (Metering & Apparatus)</option>
                    <option value="BILLING">BILLING (Billing & Revenue)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Infrastructure Maintenance)</option>
                    <option value="EMERGENCY_SAFETY">EMERGENCY_SAFETY (Emergency & Safety)</option>
                    <option value="COMMERCIAL">COMMERCIAL (Commercial Services)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region / Zone</label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    placeholder="e.g. Pune Zone"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Circle</label>
                  <input
                    type="text"
                    name="circle"
                    value={formData.circle}
                    onChange={handleChange}
                    placeholder="e.g. Pune Urban Circle"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
                  <input
                    type="text"
                    name="division"
                    value={formData.division}
                    onChange={handleChange}
                    placeholder="e.g. Shivajinagar Division"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Division / Section</label>
                  <input
                    type="text"
                    name="subdivision"
                    value={formData.subdivision}
                    onChange={handleChange}
                    placeholder="e.g. Model Colony Sub-Division"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Credentials */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <span>3. Portal Password</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-type password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I certify that I am a bonafide employee / engineer of MSEDCL. I acknowledge that submitting false credentials will lead to disciplinary and legal action, and that my account requires administrative authorization.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Onboarding Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Request & Verify Identity</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Already have an approved account?</span>
            <button
              type="button"
              onClick={onSwitchToStaffLogin}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Staff Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Staff Verification Modal */}
      <StaffVerifyModal
        isOpen={isVerifyModalOpen}
        initialIdentifier={registeredEmail}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={handleVerifySuccess}
      />
    </div>
  );
};

export default OfficerRegistrationPage;
