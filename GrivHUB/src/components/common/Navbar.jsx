import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { NotificationDropdown } from './NotificationDropdown.jsx';
import {
  Zap,
  Building,
  Globe,
  ChevronDown,
  BookOpen,
  Shield,
  Briefcase,
  User as UserIcon,
  LogOut,
  CheckCircle2
} from 'lucide-react';

export const Navbar = ({ onOpenArchGuide, onSelectGrievance }) => {
  const { currentUser, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'OFFICER':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'CITIZEN':
      default:
        return <UserIcon className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OFFICER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CITIZEN':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Civic Strip */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-[11px] sm:text-xs">
            {t('republicIndia')} • Municipal Corporation Service
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden md:inline text-slate-400">Toll-Free Helpline: 1800-1030-222</span>
          <button
            id="nav-arch-guide-btn"
            onClick={onOpenArchGuide}
            className="text-blue-300 hover:text-white flex items-center gap-1 font-medium underline underline-offset-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('navArchitectureGuide')}</span>
            <span className="sm:hidden">ML & System Docs</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
            <Zap className="w-6 h-6 fill-amber-300 stroke-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {t('appName')}
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                DISCOM AI 1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-tight">
              {t('appTagline')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200" id="language-switcher">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1 mr-1.5 hidden sm:inline" />
            <button
              id="lang-btn-en"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                language === 'en'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              id="lang-btn-hi"
              onClick={() => setLanguage('hi')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                language === 'hi'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              id="lang-btn-mr"
              onClick={() => setLanguage('mr')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                language === 'mr'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* Notifications */}
          <NotificationDropdown onSelectGrievance={onSelectGrievance} />

          {/* Role Switcher & User Profile Menu */}
          <div className="relative">
            <button
              id="user-role-menu-btn"
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-600">{currentUser.fullName?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 leading-none">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <span className={`inline-block px-1.5 py-0.2 rounded font-medium ${getRoleBadgeColor(currentUser.role)}`}>
                    {t(currentUser.role.toLowerCase())}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isRoleMenuOpen && (
              <div
                id="role-switch-dropdown"
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 z-50 p-3 overflow-hidden border border-slate-100"
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signed In As</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">{currentUser.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  {currentUser.consumer_number && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Consumer ID: {currentUser.consumer_number}
                    </p>
                  )}
                  {currentUser.employee_id && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Officer ID: {currentUser.employee_id}
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    id="nav-logout-btn"
                    onClick={() => {
                      setIsRoleMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
