import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Sparkles,
  Shield,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
  Users,
  Building2,
  MapPin,
  Sliders,
  ScrollText,
  Settings,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

export const AdminOverview = ({
  onViewGrievance,
  onNavigateTab
}) => {
  const { grievances, departments, refreshGrievances } = useGrievance();
  const { t } = useI18n();

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [slaOverview, setSlaOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);
  const [isProcessingSLA, setIsProcessingSLA] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [statsData, alertsData, slaData] = await Promise.all([
        grievanceApi.getAdminDashboardStats().catch(() => null),
        grievanceApi.getAdminAlerts().catch(() => []),
        grievanceApi.getSLAOverview().catch(() => null)
      ]);
      if (statsData) setStats(statsData);
      if (alertsData) setAlerts(alertsData);
      if (slaData) setSlaOverview(slaData);
    } catch (err) {
      console.error('Failed to load admin overview stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRunAutoClosure = async () => {
    try {
      setAutoClosing(true);
      setActionSuccessMessage(null);
      const res = await grievanceApi.triggerAutoClosure();
      setActionSuccessMessage(`Auto-closure completed: Evaluated ${res.evaluated_count} grievances, closed ${res.closed_count}.`);
      await fetchAdminData();
      await refreshGrievances();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Auto-closure error:', err);
    } finally {
      setAutoClosing(false);
    }
  };

  const handleTriggerProcessSLA = async () => {
    try {
      setIsProcessingSLA(true);
      setActionSuccessMessage(null);
      const res = await grievanceApi.triggerProcessSLA();
      setActionSuccessMessage(`MSEDCL SLA evaluation finished: Evaluated ${res.summary?.total_active_evaluated || 0} complaints, marked ${res.summary?.warnings_marked || 0} warnings, created ${res.summary?.escalations_created || 0} escalations.`);
      await fetchAdminData();
      await refreshGrievances();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err) {
      console.error('SLA trigger error:', err);
    } finally {
      setIsProcessingSLA(false);
    }
  };

  // Derive charts & fallbacks
  const total = stats?.summary?.total_grievances ?? grievances.length;
  const resolved = (stats?.by_status?.RESOLVED || 0) + (stats?.by_status?.CLOSED || 0);
  const pending = stats?.summary?.pending ?? ((stats?.by_status?.SUBMITTED || 0) + (stats?.by_status?.PENDING_ASSIGNMENT || 0) + (stats?.by_status?.ASSIGNED || 0));
  const inProgress = stats?.summary?.in_progress ?? (stats?.by_status?.IN_PROGRESS || 0);
  const reopened = stats?.by_status?.REOPENED || 0;
  const critical = stats?.summary?.critical || 0;
  const slaBreaches = stats?.summary?.sla_breaches || 0;

  // Department Load Chart Data
  const deptChartData = stats?.by_department
    ? Object.keys(stats.by_department).map((deptId) => {
        const item = stats.by_department[deptId];
        const deptObj = (departments || []).find((d) => d.id === deptId || d.department_id === deptId);
        return {
          name: deptObj?.code || deptId.substring(0, 10),
          fullName: deptObj?.name || deptId,
          active: item.active || 0,
          resolved: item.resolved || 0,
          total: item.total || 0
        };
      })
    : (departments || []).map((dept) => {
        const deptG = grievances.filter((g) => g.departmentId === dept.id || g.department_id === dept.id);
        const deptRes = deptG.filter((g) => g.status === 'RESOLVED' || g.status === 'CLOSED').length;
        return {
          name: dept.code || dept.name.substring(0, 8),
          fullName: dept.name,
          active: deptG.length - deptRes,
          resolved: deptRes,
          total: deptG.length
        };
      });

  // Category Breakdown Data
  const categoryChartData = stats?.by_category
    ? Object.keys(stats.by_category).map((catName) => ({
        name: catName,
        count: stats.by_category[catName]
      }))
    : [];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6" id="admin-overview-view">
      {/* Header Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/20 text-xs font-semibold text-indigo-300 border border-indigo-500/30 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>MSEDCL Operations Command Center</span>
          </div>
          <h1 className="text-2xl font-bold">MSEDCL Electricity Grievance Operations</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time complaint operations, AI classification oversight, officer workload balancing, and electricity service resolution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={fetchAdminData}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>

          <button
            onClick={handleTriggerProcessSLA}
            disabled={isProcessingSLA || refreshing}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Clock className={`w-3.5 h-3.5 ${isProcessingSLA ? 'animate-spin' : ''}`} />
            <span>{isProcessingSLA ? 'Processing SLA...' : 'Run MSEDCL SLA Engine'}</span>
          </button>

          <button
            onClick={handleRunAutoClosure}
            disabled={autoClosing}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition"
          >
            <Zap className={`w-3.5 h-3.5 ${autoClosing ? 'animate-bounce' : ''}`} />
            <span>{autoClosing ? 'Running Auto-Closure...' : 'Run Auto-Closure Policy'}</span>
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Real-time MSEDCL SLA Engine Analytics (Authoritative Database Aggregation) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">MSEDCL SLA Engine Performance</h2>
              <p className="text-xs text-slate-400">Live operational compliance, breach detection & multi-level utility escalations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
              Overall Compliance: {slaOverview?.summary?.compliance_rate ?? 100}%
            </span>
          </div>
        </div>

        {/* Real-Time Database SLA KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Active Complaints</span>
            <p className="text-2xl font-bold text-white mt-1">{slaOverview?.summary?.total_active_complaints ?? pending + inProgress}</p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Under monitoring</span>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-emerald-800/50">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">SLA Compliant</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{slaOverview?.summary?.sla_compliant ?? 0}</p>
            <span className="text-[10px] text-emerald-300 mt-0.5 block">Within resolution target</span>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-700/60">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">SLA Warning</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">{slaOverview?.summary?.sla_warning ?? 0}</p>
            <span className="text-[10px] text-amber-300 mt-0.5 block">&lt; threshold remaining</span>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-rose-800/60">
            <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">SLA Breached</span>
            <p className="text-2xl font-bold text-rose-400 mt-1">{slaOverview?.summary?.sla_breached ?? slaBreaches}</p>
            <span className="text-[10px] text-rose-300 mt-0.5 block">Exceeded resolution target</span>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-purple-800/60">
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Currently Escalated</span>
            <p className="text-2xl font-bold text-purple-400 mt-1">{slaOverview?.summary?.currently_escalated ?? 0}</p>
            <span className="text-[10px] text-purple-300 mt-0.5 block">JE/AE/EE/SE hierarchy</span>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-cyan-800/60">
            <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Average Resolution</span>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {slaOverview?.summary?.average_resolution_hours ? `${slaOverview.summary.average_resolution_hours}h` : 'N/A'}
            </p>
            <span className="text-[10px] text-cyan-300 mt-0.5 block">Calculated from database</span>
          </div>
        </div>

        {/* SLA Compliance by Department Grid */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            SLA Compliance by Department (Authoritative Database Queries)
          </h3>
          {slaOverview?.sla_by_department && slaOverview.sla_by_department.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slaOverview.sla_by_department.map((dept) => (
                <div key={dept.department_id || dept.code} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{dept.name}</span>
                    <span className={`text-xs font-bold ${dept.compliance_rate >= 90 ? 'text-emerald-400' : dept.compliance_rate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {dept.compliance_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${dept.compliance_rate >= 90 ? 'bg-emerald-500' : dept.compliance_rate >= 75 ? 'bg-amber-400' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, dept.compliance_rate))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Active: {dept.active_complaints}</span>
                    <span>Compliant: {dept.compliant}</span>
                    <span className="text-rose-400">Breached: {dept.breached}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No department active complaints at this moment.</p>
          )}
        </div>
      </div>

      {/* Operational Alerts Queue (Step 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Operational Alerts & System Interventions</h2>
              <p className="text-xs text-slate-500">
                Actionable system events requiring administrative review, manual assignment, or load rebalancing.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {alerts.length} Pending
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">All systems operating within standard parameters</p>
            <p className="text-xs text-slate-400 mt-1">No unassigned grievances, capacity overloads, or low-confidence predictions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.alert_id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                    alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                        alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{alert.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Type: {alert.alert_type}</span>
                      {alert.grievance_id && <span>Grievance: {alert.grievance_id}</span>}
                      {alert.officer_id && <span>Officer: {alert.officer_id}</span>}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {alert.grievance_id && (
                    <button
                      onClick={() => onViewGrievance(alert.grievance_id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {alert.alert_type === 'OFFICER_OVERLOAD' && (
                    <button
                      onClick={() => onNavigateTab('officers')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>Rebalance</span>
                    </button>
                  )}
                  {alert.alert_type === 'LOW_ML_CONFIDENCE' && (
                    <button
                      onClick={() => onNavigateTab('classification-review')}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>Review AI</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { id: 'all-grievances', label: 'Grievance Ops', icon: Shield, count: total },
          { id: 'classification-review', label: 'AI Review', icon: Sparkles, count: stats?.human_ml_corrections || 0, badge: false },
          { id: 'officers', label: 'Officer Roster', icon: Users, count: stats?.officer_metrics?.total_officers || 6 },
          { id: 'users', label: 'User Directory', icon: Users, count: stats?.user_counts?.total_users || 12 },
          { id: 'departments', label: 'Departments', icon: Building2, count: (departments || []).length },
          { id: 'jurisdictions', label: 'Jurisdictions', icon: MapPin, count: 5 },
          { id: 'routing', label: 'Routing Rules', icon: Sliders, count: 7 },
          { id: 'audit-logs', label: 'Audit Trail', icon: ScrollText, count: 'Live' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigateTab(item.id)}
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                  <Icon className="w-4 h-4" />
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {item.count}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {typeof item.count === 'number' ? `${item.count} items` : item.count}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Analytics & Performance Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Workload Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Active Load vs Resolved</h3>
              <p className="text-xs text-slate-500">Live distribution across MSEDCL service departments</p>
            </div>
            <button
              onClick={() => onNavigateTab('departments')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Manage Depts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'active' ? 'Active Backlog' : 'Resolved']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Legend />
                <Bar dataKey="active" fill="#f59e0b" name="Active Backlog" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Category Volume</h3>
              <button
                onClick={() => onNavigateTab('classification-review')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>AI Review</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Grievance classification distribution</p>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData.length > 0 ? categoryChartData : [{ name: 'None', count: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Model: DistilBERT / Scikit-learn</span>
            <span className="font-semibold text-emerald-600">Active v1.2</span>
          </div>
        </div>
      </div>

      {/* Monthly complaint trend */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Monthly Complaint Trend</h3>
        <p className="text-xs text-slate-500 mb-4">Submitted complaints grouped by database month</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.monthly_trends || []}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Complaints" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent High Priority Grievances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Critical & Escalated Grievances</h3>
            <p className="text-xs text-slate-500">MSEDCL complaints flagged for critical priority or citizen reopenings</p>
          </div>
          <button
            onClick={() => onNavigateTab('all-grievances')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <span>View All ({total})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Grievance ID</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {grievances.slice(0, 6).map((g) => (
                <tr key={g.id || g.grievance_id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {g.id || g.grievance_id}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate">
                    <span className="font-semibold text-slate-900">{g.title}</span>
                    <div className="text-[11px] text-slate-400 truncate">{g.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{g.finalCategoryName || g.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={g.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-800 font-medium">{g.officerName || g.assigned_officer_id || 'Unassigned'}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onViewGrievance(g.id || g.grievance_id)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
