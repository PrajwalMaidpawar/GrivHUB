import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';

export const VerifyAccountModal = ({ isOpen, onClose, initialEmail = '', onSuccess }) => {
  const { verifyAccount, resendVerification } = useAuth();

  const [identifier, setIdentifier] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setIdentifier(initialEmail);
    }
  }, [initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!otp.trim() || otp.length < 4) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    const result = await verifyAccount({ identifier: identifier.trim(), otp: otp.trim() });
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || 'Account verified successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1200);
    } else {
      setErrorMessage(result.error || 'Verification failed. Please check the code.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email to resend code.');
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    const result = await resendVerification({ identifier: identifier.trim() });
    setIsResending(false);

    if (result.success) {
      setSuccessMessage('A fresh verification code has been dispatched.');
      setResendCooldown(60);
    } else {
      setErrorMessage(result.error || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Verify Your Account</h2>
              <p className="text-xs text-slate-500">MSEDCL GrievanceHUB Portal</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Informational Guidance */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-5 text-xs text-blue-800 leading-relaxed flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            A 6-digit verification code has been sent to your registered contact. Please enter it below to activate your account.
          </div>
        </div>

        {/* Development Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-5 text-[11px] text-amber-800 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Safe Dev Mode: OTP is safely output to Django server console.</span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registered Email or Username
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. consumer.demo@gmail.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                6-Digit Verification Code (OTP)
              </label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                  resendCooldown > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-indigo-600 hover:text-indigo-800'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
            <input
              type="text"
              required
              maxLength={10}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center tracking-widest text-xl font-mono font-bold py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Activate & Log In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyAccountModal;
