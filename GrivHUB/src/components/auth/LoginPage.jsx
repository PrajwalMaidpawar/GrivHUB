import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Shield,
  Briefcase,
  User,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { VerifyAccountModal } from './VerifyAccountModal.jsx';
import { ForgotPasswordModal } from './ForgotPasswordModal.jsx';

export const LoginPage = ({ onSwitchToSignup, onSwitchToStaffLogin }) => {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  // Modals
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setUnverifiedEmail('');

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your email/mobile and password.');
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
        setUnverifiedEmail(result.email || identifier.trim());
        setErrorMessage('Your account has not been verified yet. Please enter the verification code sent to your contact.');
      } else {
        setErrorMessage(result.error || 'Invalid credentials.');
      }
    }
  };

  // Demo Persona Quick-Fill Helpers
  const fillDemo = (role) => {
    if (role === 'CONSUMER') {
      setIdentifier('consumer.demo@gmail.com');
      setPassword('consumer123');
    } else if (role === 'OFFICER') {
      setIdentifier('pune.officer@msedcl-grievance.in');
      setPassword('officer123');
    } else if (role === 'ADMIN') {
      setIdentifier('admin@msedcl-grievance.in');
      setPassword('admin123');
    }
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glow Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-700 flex items-center justify-center text-white shadow-xl ring-2 ring-white/10">
            <Zap className="w-7 h-7 fill-amber-300 stroke-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white">GrievanceHUB</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DISCOM 1.0
            </span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mb-6">
          Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL)
        </p>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign In to Your Portal</h1>
            <p className="text-xs text-slate-500 mt-1">
              Access your personalized Consumer, Field Officer, or System Administrator dashboard.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              {unverifiedEmail && (
                <div className="mt-1 pt-2 border-t border-red-200 flex items-center justify-between">
                  <span className="text-[11px] text-red-800">Pending OTP validation:</span>
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(true)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Verify Account Now
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier (Email, Mobile, or Username) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address, Mobile, or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. consumer.demo@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
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

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 hover:from-amber-700 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Fill Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('CONSUMER')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Consumer</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('OFFICER')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Officer</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('ADMIN')}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Admin</span>
              </button>
            </div>
          </div>

          {/* Link to Signup and Staff Portal */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500">
              New electricity consumer?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Register an account
              </button>
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <button
                type="button"
                onClick={onSwitchToStaffLogin}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                MSEDCL Staff & Administrator Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VerifyAccountModal
        isOpen={isVerifyModalOpen}
        initialEmail={unverifiedEmail || identifier}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={() => setIsVerifyModalOpen(false)}
      />

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};

export default LoginPage;
