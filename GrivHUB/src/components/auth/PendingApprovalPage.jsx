import React from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Mail,
  Zap,
  Briefcase
} from 'lucide-react';

export const PendingApprovalPage = ({ employeeId, email, onBackToLogin }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-700 flex items-center justify-center text-white shadow-xl ring-2 ring-white/10">
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

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center mb-4 shadow-xs">
            <Clock className="w-8 h-8 animate-pulse text-amber-600" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registration Submitted</h1>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Your MSEDCL staff onboarding request has been registered and verified.
          </p>

          {/* Status Breakdown Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Employee ID</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {employeeId || 'MSEDCL-STAFF'}
              </span>
            </div>

            {email && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Official Email</span>
                <span className="text-slate-700 font-medium truncate max-w-[200px]">{email}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">Contact & Identity OTP Verified</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-amber-700">
                <Clock className="w-4 h-4 shrink-0 text-amber-600 animate-spin" />
                <span className="font-semibold">Awaiting Administrator Approval</span>
              </div>
            </div>
          </div>

          {/* Informational Notice */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-left mb-6">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Staff accounts require organizational verification and approval by your Circle/Division System Administrator before assignment queue access is granted.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Staff Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
