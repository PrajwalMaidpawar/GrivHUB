import React from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import {
  FilePlus2,
  ListOrdered,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BellRing
} from 'lucide-react';

export const CitizenOverview = ({
  onNewGrievance,
  onViewGrievance,
  onViewAllGrievances
}) => {
  const { grievances, notifications, mlModelMetrics, refreshGrievances, isLoading } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  // Filter only current citizen's grievances or all in demo
  const citizenGrievances = grievances.filter((g) => {
    if (!currentUser?.id) return true;
    if (currentUser.role === 'ADMIN') return true;
    return (
      g.citizenId === currentUser.id ||
      String(g.citizenId) === String(currentUser.id) ||
      (currentUser.consumerNumber && g.consumerNumber === currentUser.consumerNumber)
    );
  });

  const stats = {
    total: citizenGrievances.length,
    open: citizenGrievances.filter((g) => ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'PENDING_REVIEW'].includes(g.status)).length,
    inProgress: citizenGrievances.filter((g) => g.status === 'IN_PROGRESS').length,
    resolved: citizenGrievances.filter((g) => g.status === 'RESOLVED').length,
    closed: citizenGrievances.filter((g) => g.status === 'CLOSED').length,
    reopened: citizenGrievances.filter((g) => g.status === 'REOPENED').length
  };

  const recentGrievances = citizenGrievances.slice(0, 5);
  const unreadNotifications = (notifications || []).filter((n) => !n.is_read && !n.isRead);

  return (
    <div className="space-y-6" id="citizen-dashboard-view">
      {/* Welcome & Primary CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-10 -translate-y-10">
          <Building className="w-80 h-80" />
        </div>
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs mb-3 text-blue-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {mlModelMetrics?.modelName || 'Electricity Complaint Classifier'} v{mlModelMetrics?.modelVersion || '1.0.0'} Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('welcome')}, {currentUser?.fullName || 'Consumer'}
          </h1>
          <p className="mt-2 text-blue-100 text-sm sm:text-base leading-relaxed">
            Report electricity supply issues like power outages, voltage fluctuations, transformer sparks, or billing discrepancies. Our local ML and safety engines automatically route your grievance to the designated MSEDCL field engineer.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              id="citizen-submit-primary-btn"
              onClick={onNewGrievance}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-800 font-bold text-sm shadow-md hover:bg-blue-50 transition-all transform active:scale-98"
            >
              <FilePlus2 className="w-5 h-5 text-blue-600" />
              {t('submitNewGrievance')}
            </button>
            <button
              id="citizen-view-all-btn"
              onClick={onViewAllGrievances}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 transition-all"
            >
              <ListOrdered className="w-4 h-4" />
              {t('viewAllGrievances')}
            </button>
            <button
              onClick={() => refreshGrievances()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-all disabled:opacity-50"
              title="Sync with MSEDCL Database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Unread Alerts Banner if Any */}
      {unreadNotifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold">
                You have {unreadNotifications.length} unread notification{unreadNotifications.length > 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-amber-700">
                Official MSEDCL updates have been posted regarding your submitted complaints.
              </p>
            </div>
          </div>
          <button
            onClick={onViewAllGrievances}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0 whitespace-nowrap"
          >
            Check Updates
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">{t('totalComplaints')}</span>
            <ListOrdered className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <span className="text-[10px] text-slate-400">Total filed</span>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-medium">{t('openComplaints')}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.open}</p>
          <span className="text-[10px] text-blue-600">Pending action</span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">{t('inProgressComplaints')}</span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900">{stats.inProgress}</p>
          <span className="text-[10px] text-amber-600">Field work active</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">{t('resolvedComplaints')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900">{stats.resolved}</p>
          <span className="text-[10px] text-emerald-600">Action completed</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-medium">{t('closedComplaints')}</span>
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.closed}</p>
          <span className="text-[10px] text-slate-500">Citizen confirmed</span>
        </div>

        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-medium">{t('reopenedComplaints')}</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900">{stats.reopened}</p>
          <span className="text-[10px] text-rose-600">Re-investigation</span>
        </div>
      </div>

      {/* Recent Grievances Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">{t('recentGrievances')}</h2>
            <p className="text-xs text-slate-500">Track current status and municipal responses in real-time</p>
          </div>
          {citizenGrievances.length > 5 && (
            <button
              onClick={onViewAllGrievances}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {t('viewAllGrievances')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentGrievances.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">{t('noGrievancesYet')}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Whenever you experience an electricity interruption, safety hazard, or billing issue, submit a complaint to have it resolved by MSEDCL engineers.
            </p>
            <button
              onClick={onNewGrievance}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors"
            >
              <FilePlus2 className="w-4 h-4" />
              {t('submitNewGrievance')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3">Complaint ID & Title</th>
                  <th className="px-4 py-3">Category & Department</th>
                  <th className="px-4 py-3">Sub-Division / Feeder</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expected Resolution</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentGrievances.map((g) => {
                  const isResolved = g.status === 'RESOLVED' || g.status === 'CLOSED';
                  const isDelayed = g.sla?.is_breached || g.sla?.sla_status === 'BREACHED';

                  return (
                    <tr
                      key={g.id}
                      onClick={() => onViewGrievance(g.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold text-blue-700">
                          {g.grievanceNumber}
                        </div>
                        <div className="font-semibold text-slate-900 text-xs mt-0.5 max-w-xs sm:max-w-md truncate">
                          {g.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(g.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{g.finalCategoryName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {g.departmentName}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{g.location?.serviceArea || g.location?.ward || 'Pune Urban Sub-Division'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {g.location?.locality || g.location?.city}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={g.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={g.status} />
                      </td>
                      <td className="px-4 py-4">
                        {isResolved ? (
                          <div className="text-emerald-700 font-semibold text-[11px]">
                            Resolved on time
                          </div>
                        ) : isDelayed ? (
                          <div>
                            <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Resolution taking longer than SLA</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Escalated for senior engineering action
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[11px] text-slate-800 font-semibold">
                              {g.sla?.due_at ? `Expected: ${new Date(g.sla.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}` : 'Standard SLA Window'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Assigned: MSEDCL Field Team
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewGrievance(g.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          {t('viewDetails')}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
