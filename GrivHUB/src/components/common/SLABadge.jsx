import React from 'react';
import { Clock, AlertTriangle, AlertCircle, PauseCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

/**
 * Reusable MSEDCL SLA Badge & Countdown component
 */
export const SLABadge = ({ sla, status, priority, compact = false, showProgress = false }) => {
  if (!sla && !status) return null;

  const isResolved = status === 'RESOLVED' || status === 'CLOSED';
  const isPaused = sla?.is_paused || sla?.sla_status === 'PAUSED';
  const isBreached = sla?.is_breached || sla?.sla_status === 'BREACHED';
  const isWarning = sla?.is_warning || sla?.sla_status === 'WARNING';
  const remainingSeconds = sla?.remaining_seconds ?? null;

  // Format time display
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return null;
    const absSec = Math.abs(seconds);
    const hours = Math.floor(absSec / 3600);
    const mins = Math.floor((absSec % 3600) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(mins)}m`;
  };

  const timeStr = formatTime(remainingSeconds);

  // Calculate progress percentage if target minutes is available
  let progressPercent = 0;
  if (sla?.target_minutes && remainingSeconds !== null) {
    const totalSec = sla.target_minutes * 60;
    const elapsedSec = totalSec - remainingSeconds;
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 100)));
  }

  if (compact) {
    if (isResolved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    }
    if (isPaused) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <PauseCircle className="w-3 h-3 text-slate-500" />
          <span>Paused</span>
        </span>
      );
    }
    if (isBreached) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>+{timeStr || 'Overdue'}</span>
          {sla?.escalation_level && sla.escalation_level !== 'NONE' && (
            <span className="bg-rose-200 text-rose-900 px-1 rounded text-[9px]">
              {sla.escalation_level.replace('LEVEL_', 'L')}
            </span>
          )}
        </span>
      );
    }
    if (isWarning) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>{timeStr || 'Near Due'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Clock className="w-3 h-3 text-blue-500" />
        <span>{timeStr ? `${timeStr} left` : 'Active SLA'}</span>
      </span>
    );
  }

  // Full card / badge style
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          {isResolved ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              SLA Met (Resolved)
            </span>
          ) : isPaused ? (
            <span className="text-slate-600 flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
              SLA Paused ({sla?.pause_reason || 'Pending Citizen'})
            </span>
          ) : isBreached ? (
            <span className="text-rose-700 flex items-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              SLA BREACHED (+{timeStr || 'Overdue'})
            </span>
          ) : isWarning ? (
            <span className="text-amber-700 flex items-center gap-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ⚠ SLA WARNING ({timeStr} left)
            </span>
          ) : (
            <span className="text-blue-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              SLA: {timeStr ? `${timeStr} remaining` : 'Active'}
            </span>
          )}
        </div>

        {sla?.escalation_level && sla.escalation_level !== 'NONE' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
            Escalation: {sla.escalation_display || sla.escalation_level}
          </span>
        )}
      </div>

      {showProgress && !isResolved && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isBreached ? 'bg-rose-500 w-full' : isWarning ? 'bg-amber-500' : 'bg-blue-600'
            }`}
            style={{ width: isBreached ? '100%' : `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
