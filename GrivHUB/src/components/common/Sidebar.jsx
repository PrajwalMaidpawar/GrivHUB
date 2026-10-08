import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import {
  LayoutDashboard,
  FilePlus2,
  ListOrdered,
  Briefcase,
  Layers,
  Sparkles,
  Building2,
  HelpCircle,
  Bell,
  UserCheck,
  Gauge,
  Users,
  UserCog,
  MapPin,
  Sliders,
  ScrollText,
  Settings,
  ShieldCheck,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  onSelectTab,
  onOpenArchGuide
}) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const { notifications } = useGrievance();

  const unreadCount = (notifications || []).filter((n) => {
    const forUser = !n.user_id || n.user_id === currentUser?.id || n.userId === currentUser?.id || currentUser?.role === 'ADMIN';
    return forUser && !n.is_read && !n.isRead;
  }).length;

  const renderNavItems = () => {
    switch (currentUser?.role) {
      case 'CONSUMER':
      case 'CITIZEN':
        return [
          { id: 'overview', label: t('navDashboard'), icon: LayoutDashboard },
          { id: 'new-grievance', label: t('navSubmitGrievance'), icon: FilePlus2 },
          { id: 'my-grievances', label: t('navMyGrievances'), icon: ListOrdered },
          { id: 'notifications', label: t('notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { id: 'profile', label: 'Citizen Profile', icon: UserCheck }
        ];
      case 'OFFICER':
        return [
          { id: 'overview', label: t('navDashboard'), icon: LayoutDashboard },
          { id: 'work-queue', label: t('navWorkQueue'), icon: Briefcase },
          { id: 'workload', label: 'Workload & Capacity', icon: Gauge },
          { id: 'notifications', label: t('notifications') || 'Notifications', icon: Bell, badge: unreadCount },
          { id: 'profile', label: 'Officer Profile', icon: UserCheck }
        ];
      case 'ADMIN':
        return [
          { id: 'overview', label: 'Admin Dashboard', icon: LayoutDashboard },
          { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
          { id: 'analytics', label: 'Real Analytics', icon: BarChart3 },
          { id: 'reports', label: 'Official Reports', icon: FileSpreadsheet },
          { id: 'all-grievances', label: 'Grievance Ops', icon: Layers },
          { id: 'classification-review', label: 'AI Review & ML', icon: Sparkles },
          { id: 'officers', label: 'Officer Roster', icon: UserCog },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'jurisdictions', label: 'Jurisdictions', icon: MapPin },
          { id: 'routing', label: 'Routing Rules', icon: Sliders },
          { id: 'audit-logs', label: 'Audit Trail', icon: ScrollText },
          { id: 'settings', label: 'System Settings', icon: Settings },
          { id: 'notifications', label: t('notifications') || 'Notifications', icon: Bell, badge: unreadCount }
        ];
      default:
        return [];
    }
  };

  const navItems = renderNavItems();

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {currentUser.role} Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {Boolean(item.badge) && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Help Box */}
      <div className="mt-8 pt-4 border-t border-slate-100">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Civic Support</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Indian Municipal Corporation Service Portal
          </p>
          <button
            onClick={onOpenArchGuide}
            className="mt-2.5 w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] transition-colors"
          >
            System & ML Docs
          </button>
        </div>
      </div>
    </aside>
  );
};
