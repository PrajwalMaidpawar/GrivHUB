import React from 'react';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

export const PriorityBadge = ({
  priority,
  className = '',
  showIcon = true
}) => {
  const { t } = useI18n();

  const getPriorityConfig = () => {
    switch (priority) {
      case 'CRITICAL':
        return {
          style: 'bg-red-50 text-red-700 border-red-200',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
        };
      case 'HIGH':
        return {
          style: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: <ArrowUp className="w-3.5 h-3.5 mr-1 text-orange-600" />
        };
      case 'MEDIUM':
        return {
          style: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-blue-600" />
        };
      case 'LOW':
        return {
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <ArrowDown className="w-3.5 h-3.5 mr-1 text-slate-500" />
        };
      default:
        return {
          style: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: null
        };
    }
  };

  const config = getPriorityConfig();
  const priorityKey = `priority${priority}`;
  const label = t(priorityKey);

  return (
    <span
      id={`priority-badge-${(priority || '').toLowerCase()}`}
      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-md border font-medium whitespace-nowrap ${config.style} ${className}`}
    >
      {showIcon && config.icon}
      {label}
    </span>
  );
};
