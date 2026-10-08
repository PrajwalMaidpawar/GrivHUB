import React from 'react';
import { useI18n } from '../../i18n/i18nContext.jsx';

export const StatusBadge = ({ status, className = '', size = 'md' }) => {
  const { t } = useI18n();

  const getStatusStyles = () => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UNDER_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ASSIGNED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'REOPENED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 border-red-300 font-semibold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium'
  };

  const statusKey = `status${status}`;
  const label = t(statusKey);

  return (
    <span
      id={`status-badge-${(status || '').toLowerCase()}`}
      className={`inline-flex items-center rounded-md border font-medium whitespace-nowrap ${getStatusStyles()} ${sizeClasses[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {label}
    </span>
  );
};
