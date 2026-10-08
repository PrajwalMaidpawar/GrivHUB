import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';

export const NotificationDropdown = ({ onSelectGrievance }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, markAllNotificationsRead } = useGrievance();
  const { currentUser } = useAuth();
  const { language, t } = useI18n();
  const dropdownRef = useRef(null);

  const userNotifications = notifications.filter(
    (n) => n.userId === currentUser.id || currentUser.role === 'ADMIN'
  );
  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef} id="notification-dropdown-container">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-menu-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{t('notifications')}</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={() => markAllNotificationsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {userNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {t('noNotifications')}
              </div>
            ) : (
              userNotifications.slice(0, 10).map((notif) => {
                const titleText =
                  language === 'hi'
                    ? notif.titleHi || notif.title
                    : language === 'mr'
                    ? notif.titleMr || notif.title
                    : notif.title;

                const msgText =
                  language === 'hi'
                    ? notif.messageHi || notif.message
                    : language === 'mr'
                    ? notif.messageMr || notif.message
                    : notif.message;

                return (
                  <div
                    key={notif.id}
                    id={`notif-item-${notif.id}`}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.grievanceId && onSelectGrievance) {
                        onSelectGrievance(notif.grievanceId);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                      !notif.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {titleText}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{msgText}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
