import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import { SLABadge } from '../common/SLABadge.jsx';
import {
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Gauge,
  AlertTriangle,
  Clock,
  Bell,
  Eye,
  RefreshCw
} from 'lucide-react';

export const OfficerOverview = ({
  onViewGrievance,
  onViewAllTasks
}) => {
  const { grievances, departments, fetchOfficerWorkload, refreshGrievances, notifications, markNotificationRead } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [workloadSummary, setWorkloadSummary] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadWorkload = async () => {
      try {
        const data = await fetchOfficerWorkload(currentUser.id || 'OFF-ROADS-001');
        if (isMounted && data) {
          setWorkloadSummary(data);
        }
      } catch (e) {
        console.warn('Workload fetch error:', e);
      }
    };
    loadWorkload();
    return () => {
      isMounted = false;
    };
  }, [currentUser, fetchOfficerWorkload]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshGrievances();
      const data = await fetchOfficerWorkload(currentUser.id || 'OFF-ROADS-001');
      if (data) setWorkloadSummary(data);
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Assigned tickets to this officer
  const assignedGrievances = grievances.filter(
    (g) => g.assignedOfficerId === currentUser.id || (!g.assignedOfficerId && g.departmentId === currentUser.departmentId)
  );

  const stats = {
    assigned: assignedGrievances.filter((g) => g.status === 'ASSIGNED').length,
    inProgress: assignedGrievances.filter((g) => g.status === 'IN_PROGRESS').length,
    highCritical: assignedGrievances.filter(
      (g) => (g.priority === 'CRITICAL' || g.priority === 'HIGH') && g.status !== 'RESOLVED' && g.status !== 'CLOSED'
    ).length,
    resolved: assignedGrievances.filter(
      (g) => g.status === 'RESOLVED' || g.status === 'CLOSED'
    ).length,
    reopened: assignedGrievances.filter((g) => g.status === 'REOPENED').length
  };

  const myDept = departments.find(
    (d) => d.id === currentUser.departmentId || d.department_id === currentUser.departmentId
  );

  const maxCapacity = workloadSummary?.maximum_workload || currentUser.maxWorkload || 15;
  const currentActive = workloadSummary?.active_workload ?? (stats.assigned + stats.inProgress + stats.reopened);
  const loadPercentage = Math.min(100, Math.round((currentActive / maxCapacity) * 100));

  // Urgent attention queue: Critical/High or Reopened
  const priorityQueue = assignedGrievances
    .filter((g) => g.status !== 'RESOLVED' && g.status !== 'CLOSED')
    .sort((a, b) => {
      if (a.status === 'REOPENED' && b.status !== 'REOPENED') return -1;
      if (b.status === 'REOPENED' && a.status !== 'REOPENED') return 1;
      const pOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    })
    .slice(0, 5);

  // Unread officer notifications
  const officerNotifications = (notifications || []).filter(
    (n) => (!n.user_id || n.user_id === currentUser.id || n.userId === currentUser.id) && !n.is_read && !n.isRead
  ).slice(0, 3);

  return (
    <div className="space-y-6" id="officer-overview-view">
      {/* Officer Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-900/60 text-xs font-semibold text-blue-300 border border-blue-700/40 mb-2.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="truncate max-w-[280px]">{myDept?.name || 'Electricity Operations Division'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{currentUser.fullName}</h1>
          <p className="text-xs text-slate-300 mt-1">
            {currentUser.designation || 'Junior Engineer'} • MSEDCL {currentUser.city || 'Pune'} Circle
          </p>
        </div>

        {/* Live Workload Utilization Meter */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full md:w-72">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Field Workload</span>
            </span>
            <span className={loadPercentage > 85 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {currentActive} / {maxCapacity} Tasks ({loadPercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                loadPercentage >= 85 ? 'bg-rose-500' : loadPercentage >= 60 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
            <span>Availability: <strong className="text-slate-200">{currentUser.availabilityStatus || 'AVAILABLE'}</strong></span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">{t('kpiAssigned') || 'Assigned'}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.assigned}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting first action</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-amber-800">{t('kpiInProgress') || 'In Progress'}</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.inProgress}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Field repairs underway</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-red-800">{t('kpiHighCritical') || 'Critical SLA'}</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.highCritical}</p>
          <p className="text-[10px] text-red-700 mt-0.5">Urgent municipal dispatch</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-800">{t('kpiResolvedToday') || 'Resolved / Closed'}</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.resolved}</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Completed resolutions</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-rose-800">{t('reopenedComplaints') || 'Reopened'}</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">{stats.reopened}</p>
          <p className="text-[10px] text-rose-700 mt-0.5">Citizen follow-up required</p>
        </div>
      </div>

      {/* Notifications Banner if any unread */}
      {officerNotifications.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900">
                Actionable System Alerts ({officerNotifications.length})
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">New assignment or citizen reopen updates</span>
          </div>
          <div className="space-y-1.5">
            {officerNotifications.map((notif) => (
              <div
                key={notif.notification_id || notif.id}
                className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{notif.title}</span>
                  <span className="text-slate-500 line-clamp-1 text-[11px]">{notif.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {notif.grievance_id && (
                    <button
                      onClick={() => onViewGrievance(notif.grievance_id)}
                      className="text-blue-700 hover:text-blue-900 font-bold text-[11px]"
                    >
                      Open Ticket
                    </button>
                  )}
                  <button
                    onClick={() => markNotificationRead(notif.notification_id || notif.id)}
                    className="text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Action Work Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Priority Field Task Queue</h2>
            <p className="text-xs text-slate-500">Critical grievances, reopened tickets, and pending field dispatches</p>
          </div>
          <button
            id="officer-view-all-queue-btn"
            onClick={onViewAllTasks}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>{t('viewAllGrievances') || 'View All Assigned Tasks'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">All assigned field tasks are resolved!</p>
            <p className="text-slate-400 mt-0.5">No open grievances pending in your active work queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Complaint Details</th>
                  <th className="px-4 py-3">Sub-Division / Area</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">MSEDCL SLA</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Field Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityQueue.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => onViewGrievance(g.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700">{g.grievanceNumber}</span>
                        {g.priority === 'CRITICAL' && (
                          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                            CRITICAL
                          </span>
                        )}
                        {g.status === 'REOPENED' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            REOPENED
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5 max-w-sm line-clamp-1">
                        {g.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Consumer: {g.citizenName || 'Consumer'} • {g.finalCategoryName}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="font-medium">{g.location?.serviceArea || g.location?.ward || 'Pune Urban Sub-Division'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{g.location?.locality}</div>
                    </td>
                    <td className="px-4 py-4">
                      <PriorityBadge priority={g.priority} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[170px]">
                        <SLABadge sla={g.sla} status={g.status} priority={g.priority} compact={true} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-[11px]">
                      {new Date(g.submittedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewGrievance(g.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Workspace</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
