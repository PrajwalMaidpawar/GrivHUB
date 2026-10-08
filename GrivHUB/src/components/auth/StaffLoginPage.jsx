import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Zap,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Shield,
  Clock,
  User,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { StaffVerifyModal } from './StaffVerifyModal.jsx';

export const StaffLoginPage = ({
  onSwitchToConsumerLogin,
  onSwitchToStaffRegister,
  onShowPendingApproval
}) => {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingNotice, setPendingNotice] = useState(null);

  // Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [unverifiedContact, setUnverifiedContact] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setPendingNotice(null);
    setUnverifiedContact('');

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your Official Email / Employee ID and password.');
      return;
    }

    setIsLoading(true);
    const result = await login({
      identifier: identifier.trim(),
      password
    });
    setIsLoading(false);

    if (!result.success) {
      if (result.requiresVerification) {
        setUnverifiedContact(result.email || identifier.trim());
        setErrorMessage('Your official contact has not been verified yet. Please enter your verification OTP.');
      } else if (result.requiresApproval || result.approvalStatus === 'PENDING_APPROVAL') {
        setPendingNotice({
          employeeId: result.employeeId || identifier.trim(),
          email: result.email || identifier.trim()
        });
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      }
    }
  };

  const fillDemo = (role) => {
    setErrorMessage('');
    setPendingNotice(null);
    if (role === 'APPROVED_OFFICER') {
      setIdentifier('pune.officer@msedcl-grievance.in');
      setPassword('officer123');
    } else if (role === 'PENDING_OFFICER') {
      setIdentifier('pending.officer@msedcl-grievance.in');
      setPassword('officer123');
    } else if (role === 'ADMIN') {
      setIdentifier('admin@msedcl-grievance.in');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-xl ring-2 ring-white/10">
            <Zap className="w-7 h-7 fill-amber-300 stroke-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white">GrievanceHUB</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              STAFF PORTAL
            </span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mb-6">
          Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)
        </p>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Admin Gateway</h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your MSEDCL Official Email or Employee ID.
            </p>
          </div>

          {/* Pending Approval Notice */}
          {pendingNotice && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 animate-in fade-in space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Administrative Approval</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Your staff account is verified but is awaiting administrator authorization.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onShowPendingApproval) {
                    onShowPendingApproval(pendingNotice);
                  }
                }}
                className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                View Account Status
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              {unverifiedContact && (
                <div className="mt-1 pt-2 border-t border-red-200 flex items-center justify-between">
                  <span className="text-[11px] text-red-800">Pending identity OTP:</span>
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(true)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Verify OTP Now
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Email or Employee ID
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. pune.officer@msedcl-grievance.in or DEMO-OFFICER-001"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Staff</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Fill Demo Personas
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('APPROVED_OFFICER')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Approved Officer</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('PENDING_OFFICER')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Pending Officer</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('ADMIN')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Admin</span>
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
            <p className="text-slate-500">
              New MSEDCL Staff?{' '}
              <button
                type="button"
                onClick={onSwitchToStaffRegister}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Staff Account Activation Request
              </button>
            </p>

            <p className="text-slate-500">
              Electricity consumer?{' '}
              <button
                type="button"
                onClick={onSwitchToConsumerLogin}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Switch to Consumer Sign In
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Staff Verification Modal */}
      <StaffVerifyModal
        isOpen={isVerifyModalOpen}
        initialIdentifier={unverifiedContact}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={(res) => {
          setIsVerifyModalOpen(false);
          setPendingNotice({
            employeeId: res.employee_id || unverifiedContact,
            email: unverifiedContact
          });
        }}
      />
    </div>
  );
};

export default StaffLoginPage;
