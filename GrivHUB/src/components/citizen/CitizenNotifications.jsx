import React, { useState } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const CitizenNotifications = ({ onViewGrievance }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, refreshNotifications, isLoading } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const userNotifications = (notifications || []).filter((n) => {
    return !n.user_id || n.user_id === currentUser.id || n.userId === currentUser.id || currentUser.role === 'ADMIN';
  });

  const filtered = userNotifications.filter((n) => {
    const isRead = n.is_read || n.isRead;
    if (filter === 'UNREAD') return !isRead;
    return true;
  });

  const unreadCount = userNotifications.filter((n) => !n.is_read && !n.isRead).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ALERT':
      case 'HIGH_PRIORITY':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'SUCCESS':
      case 'RESOLVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="citizen-notifications-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('notifications')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status alerts and municipal officer field updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshNotifications()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Filter */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({userNotifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No Notifications</p>
            <p className="text-xs text-slate-500 mt-1">You are all caught up on your municipal updates.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = item.is_read || item.isRead;
            const notifId = item.id || item.notification_id;
            const grievanceId = item.grievance_id || item.grievanceId;

            return (
              <div
                key={notifId}
                onClick={() => {
                  if (!isRead) markNotificationRead(notifId);
                  if (grievanceId && onViewGrievance) onViewGrievance(grievanceId);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  isRead
                    ? 'bg-white border-slate-200 hover:border-slate-300 opacity-80'
                    : 'bg-blue-50/60 border-blue-200 hover:border-blue-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 rounded-xl bg-white shadow-2xs border border-slate-100">
                    {getNotificationIcon(item.notification_type || item.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.title || item.title_en || 'Municipal Update'}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.message || item.message_en}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.created_at || item.createdAt || Date.now()).toLocaleString('en-GB')}</span>
                      {grievanceId && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-semibold text-blue-700">Ticket: {grievanceId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {grievanceId && (
                  <button className="text-slate-400 hover:text-blue-600 shrink-0 p-1">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
