import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  ShieldCheck,
  KeyRound,
  AlertCircle,
  RefreshCw,
  X,
  Clock,
  ArrowRight
} from 'lucide-react';

export const StaffVerifyModal = ({ isOpen, initialIdentifier, onClose, onSuccess }) => {
  const { verifyStaff, resendStaffVerification } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (initialIdentifier) {
      setIdentifier(initialIdentifier);
    }
  }, [initialIdentifier]);

  useEffect(() => {
    if (!isOpen) return;
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!identifier.trim() || !otp.trim()) {
      setErrorMessage('Please provide your identifier and 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    const result = await verifyStaff({
      identifier: identifier.trim(),
      otp: otp.trim()
    });
    setIsLoading(false);

    if (result.success) {
      if (onSuccess) {
        onSuccess(result);
      }
    } else {
      setErrorMessage(result.error || 'Verification failed. Please check the code and try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setErrorMessage('');
    setInfoMessage('');
    setIsResending(true);

    const result = await resendStaffVerification({ identifier: identifier.trim() });
    setIsResending(false);

    if (result.success) {
      setInfoMessage('A fresh verification code has been dispatched.');
      setCooldown(60);
    } else {
      setErrorMessage(result.error || 'Failed to resend code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff Contact Verification</h2>
            <p className="text-xs text-slate-500">MSEDCL Identity Ownership Verification</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Email / Employee ID
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. employee@msedcl.in or EMP001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              6-Digit Verification OTP
            </label>
            <input
              type="text"
              maxLength={8}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="w-full text-center tracking-widest font-mono text-xl py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">Didn't receive the OTP?</span>
            <button
              type="button"
              disabled={cooldown > 0 || isResending}
              onClick={handleResend}
              className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              {cooldown > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Resend in {cooldown}s</span>
                </>
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Contact...</span>
              </>
            ) : (
              <>
                <span>Confirm & Submit for Approval</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffVerifyModal;
