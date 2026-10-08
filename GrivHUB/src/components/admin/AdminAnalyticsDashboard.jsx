import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Users,
  Building2,
  MapPin,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi.js';
import { grievanceApi } from '../../api/grievanceApi.js';

const STATUS_COLORS = {
  SUBMITTED: '#64748b',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#059669',
  REOPENED: '#ef4444',
  REJECTED: '#94a3b8'
};

const CATEGORY_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#4f46e5', '#ca8a04'
];

export const AdminAnalyticsDashboard = ({ onNavigateReports }) => {
  // Filter States
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [groupBy, setGroupBy] = useState('day');
  const [departmentsList, setDepartmentsList] = useState([]);

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusDist, setStatusDist] = useState({});
  const [deptAnalytics, setDeptAnalytics] = useState([]);
  const [resTimes, setResTimes] = useState(null);
  const [officerWorkloads, setOfficerWorkloads] = useState([]);
  const [reopenData, setReopenData] = useState(null);
  const [routingData, setRoutingData] = useState(null);
  const [locationsData, setLocationsData] = useState(null);
  const [mlData, setMlData] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);

  // Active View Tab inside Analytics
  const [activeSection, setActiveSection] = useState('executive');

  // Load Departments for dropdown
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const depts = await grievanceApi.getDepartments();
        setDepartmentsList(Array.isArray(depts) ? depts : (depts?.departments || []));
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  // Handle Date Preset Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === '7D') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30D') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '90D') {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch all analytics datasets
  const fetchAllAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const params = {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      department_id: selectedDept !== 'ALL' ? selectedDept : undefined,
      group_by: groupBy
    };

    try {
      const [
        overviewRes,
        trendsRes,
        categoriesRes,
        statusRes,
        deptRes,
        resTimesRes,
        officerRes,
        reopenRes,
        routingRes,
        locRes,
        mlRes,
        qualityRes
      ] = await Promise.all([
        analyticsApi.getOverview(params),
        analyticsApi.getTrends(params),
        analyticsApi.getCategories(params),
        analyticsApi.getStatusDistribution(params),
        analyticsApi.getDepartments(params),
        analyticsApi.getResolutionTimes(params),
        analyticsApi.getOfficerWorkload(params),
        analyticsApi.getReopens(params),
        analyticsApi.getRouting(params),
        analyticsApi.getLocations(params),
        analyticsApi.getMLOverview(),
        analyticsApi.getDataQuality()
      ]);

      setOverview(overviewRes);
      setTrends(trendsRes || []);
      setCategories(categoriesRes || []);
      setStatusDist(statusRes || {});
      setDeptAnalytics(deptRes || []);
      setResTimes(resTimesRes);
      setOfficerWorkloads(officerRes || []);
      setReopenData(reopenRes);
      setRoutingData(routingRes);
      setLocationsData(locRes);
      setMlData(mlRes);
      setDataQuality(qualityRes);
    } catch (err) {
      console.error('Failed to load analytics datasets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load real analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [startDate, endDate, selectedDept, groupBy]);

  // Handle CSV Export
  const handleExportCSV = async (datasetType = 'grievances') => {
    try {
      const blob = await analyticsApi.exportCSV({
        dataset_type: datasetType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        department_id: selectedDept !== 'ALL' ? selectedDept : undefined
      });

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grievancehub_${datasetType}_analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export.');
    }
  };

  // Status Distribution Pie Data
  const pieData = Object.entries(statusDist)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: STATUS_COLORS[status] || '#64748b'
    }));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Municipal Intelligence & Analytics Engine
                </h1>
                <p className="text-xs text-slate-500">
                  Data-driven aggregations, time series trends, workforce capacity, and active learning diagnostics
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchAllAnalytics(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>

            <div className="relative inline-block text-left">
              <button
                onClick={() => handleExportCSV('grievances')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Formal Reports</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {['ALL', '7D', '30D', '90D', 'CUSTOM'].map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  datePreset === p
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'ALL' ? 'All Time' : p === '7D' ? 'Last 7 Days' : p === '30D' ? 'Last 30 Days' : p === '90D' ? 'Last 90 Days' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs (when selected or anytime) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>From:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ml-2"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Trends Grouping */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Analytics Retrieval Error:</span> {error}
          </div>
        </div>
      )}

      {/* Analytics Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'executive', label: 'Executive Overview', icon: Layers },
          { id: 'trends', label: 'Volume & Resolution Trends', icon: TrendingUp },
          { id: 'departments', label: 'Departments & Workforce', icon: Building2 },
          { id: 'categories', label: 'Civic Categories & SLA', icon: Sliders },
          { id: 'routing', label: 'Routing & Geographic', icon: MapPin },
          { id: 'ml', label: 'ML Monitoring & Active Learning', icon: Cpu },
          { id: 'quality', label: 'Data Quality & Integrity', icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading state skeleton */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-600">Computing analytics aggregations directly from database...</p>
        </div>
      )}

      {!loading && overview && (
        <>
          {/* SECTION 1: EXECUTIVE OVERVIEW */}
          {activeSection === 'executive' && (
            <div className="space-y-6">
              {/* Top Key Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {overview.total_grievances.toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-blue-600">{overview.new_grievances} new</span> submitted
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Pipeline</span>
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-600">
                    {overview.open_grievances.toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>{overview.in_progress} in progress</span>
                    <span>• {overview.reopened} reopened</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Resolution</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {overview.average_resolution_hours !== null ? `${overview.average_resolution_hours} hrs` : 'N/A'}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
                    {overview.resolved + overview.closed} resolved or closed
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reopen Rate</span>
                    <RotateCcw className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {(overview.overall_reopen_rate * 100).toFixed(1)}%
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {overview.reopened} reopened grievances
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Field Officers</span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {overview.active_officers_count} <span className="text-xs text-slate-400 font-normal">/ {overview.total_officers_count} available</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Active capacity monitoring
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Assignment</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {overview.pending_assignment}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-600 font-semibold">
                    Awaiting dispatch
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ML Agreement Rate</span>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">
                    {overview.reviewed_prediction_agreement_rate !== null
                      ? `${(overview.reviewed_prediction_agreement_rate * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Human review accuracy
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Data Health</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-emerald-600">
                    {dataQuality ? `${dataQuality.data_health_score_pct}%` : '100%'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {dataQuality?.clean_records_count || overview.total_grievances} valid records
                  </div>
                </div>
              </div>

              {/* Chart Grid: Volume Trend + Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2 Cols: Trend Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Grievance Submission & Resolution Timeline</h2>
                      <p className="text-[11px] text-slate-500">Chronological volume aggregated directly from database timestamps</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {trends.length} periods
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    {trends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Line type="monotone" dataKey="submitted" name="Submissions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="reopened" name="Reopened" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No submissions recorded for this time interval
                      </div>
                    )}
                  </div>
                </div>

                {/* 1 Col: Status Distribution */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Lifecycle Status Breakdown</h2>
                    <p className="text-[11px] text-slate-500">Distribution across active workflow stages</p>
                  </div>

                  <div className="h-52 w-full my-auto">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val, name) => [`${val} grievances`, name]}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No status data
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-3 border-t border-slate-100">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}:</span>
                        <span className="font-bold text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: VOLUME & RESOLUTION TRENDS */}
          {activeSection === 'trends' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Period-Wise Intake & Resolution Velocity</h2>
                    <p className="text-[11px] text-slate-500">Comparison of newly submitted civic complaints versus resolved cases</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV('grievances')}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      Export Trend Data
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="submitted" name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reopened" name="Reopened" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resolution Duration Breakdown */}
              {resTimes && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Resolution Duration Analytics (Hours)</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Calculated from created_at to resolved_at / closed_at timestamps</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Average Duration</span>
                      <div className="text-lg font-black text-slate-900">
                        {resTimes.overall?.average_hours !== null ? `${resTimes.overall?.average_hours} hrs` : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Median Duration</span>
                      <div className="text-lg font-black text-slate-900">
                        {resTimes.overall?.median_hours !== null ? `${resTimes.overall?.median_hours} hrs` : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Fastest Resolution</span>
                      <div className="text-lg font-black text-emerald-600">
                        {resTimes.overall?.min_hours !== null ? `${resTimes.overall?.min_hours} hrs` : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Longest Duration</span>
                      <div className="text-lg font-black text-rose-600">
                        {resTimes.overall?.max_hours !== null ? `${resTimes.overall?.max_hours} hrs` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Department</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Resolved Count</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Avg Duration (Hours)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Min (Hours)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Max (Hours)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resTimes.by_department?.map((d) => (
                          <tr key={d.department} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">{d.department}</td>
                            <td className="py-2.5 px-3 text-right text-slate-700">{d.count}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-blue-600">{d.average_hours} hrs</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600">{d.min_hours} hrs</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">{d.max_hours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DEPARTMENTS & WORKFORCE */}
          {activeSection === 'departments' && (
            <div className="space-y-6">
              {/* Department Performance Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Municipal Department Operational Matrix</h2>
                    <p className="text-[11px] text-slate-500">Live intake, resolution efficiency, and active capacity utilization</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('departments')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    Export Departments
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Department</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Active Backlog</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Resolved</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Reopen Rate</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Avg Resolution</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Officers</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Capacity Saturation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptAnalytics.map((d) => (
                        <tr key={d.department_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{d.name}</div>
                            <div className="text-[10px] text-slate-400">{d.department_id}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{d.total}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.active > 10 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.active} active
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{d.resolved + d.closed}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {(d.reopen_rate * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                            {d.average_resolution_hours !== null ? `${d.average_resolution_hours} hrs` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {d.active_officers_count} / {d.officer_count} avail
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {d.capacity_utilization_pct !== null ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      d.capacity_utilization_pct > 80 ? 'bg-rose-500' : d.capacity_utilization_pct > 50 ? 'bg-amber-500' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${Math.min(100, d.capacity_utilization_pct)}%` }}
                                  />
                                </div>
                                <span className="font-bold">{d.capacity_utilization_pct}%</span>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Field Workforce Allocation & Capacity Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Field Workforce Workload & Capacity Utilization</h2>
                    <p className="text-[11px] text-slate-500">Real-time task allocations and saturation ceilings per engineer</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('officers')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    Export Officers
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Officer Name & ID</th>
                        <th className="py-2.5 px-3 font-semibold">Department</th>
                        <th className="py-2.5 px-3 font-semibold">Availability</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Active Tasks</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Max Capacity</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Utilization (%)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Resolved</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Reopened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {officerWorkloads.map((o) => (
                        <tr key={o.officer_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{o.name}</div>
                            <div className="text-[10px] text-slate-400">{o.officer_id} • {o.designation}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{o.department}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.availability_status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.availability_status === 'ON_LEAVE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {o.availability_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{o.active_cases}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{o.maximum_capacity}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              o.is_overloaded
                                ? 'bg-rose-100 text-rose-800'
                                : (o.utilization_percentage || 0) > 70
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {o.utilization_percentage !== null ? `${o.utilization_percentage}%` : '0%'}
                              {o.is_overloaded && ' (OVERLOADED)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{o.resolved_cases + o.closed_cases}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600">{o.reopened_cases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CIVIC CATEGORIES & SLA */}
          {activeSection === 'categories' && (
            <div className="space-y-6">
              {/* Category Breakdown Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Civic Issue Category Distribution & Demand</h2>
                    <p className="text-[11px] text-slate-500">Derived from officer verified categories with AI model fallback</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('categories')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    Export Categories
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Civic Category</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Total Count</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Active Pipeline</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Resolved</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Human Corrections</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Avg Confidence</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Avg Duration</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Reopen Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categories.map((c, idx) => (
                        <tr key={c.category} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                              <span className="font-bold text-slate-900">{c.category}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{c.count}</td>
                          <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">{c.active}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{c.resolved + c.closed}</td>
                          <td className="py-2.5 px-3 text-right">
                            {c.corrected_count > 0 ? (
                              <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                                {c.corrected_count} corrected
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {c.average_confidence !== null ? `${(c.average_confidence * 100).toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                            {c.average_resolution_hours !== null ? `${c.average_resolution_hours} hrs` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {(c.reopen_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reopen Root Cause Analysis */}
              {reopenData && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Citizen Reopen Analysis & Audit Trail</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Reasons logged by citizens when rejecting officer resolutions</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
                      <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Overall Reopen Frequency</span>
                      <div className="text-2xl font-black text-rose-900 mt-1">
                        {reopenData.total_reopened_grievances} <span className="text-xs font-normal text-rose-600">/ {reopenData.eligible_resolution_base} resolved</span>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-1">
                        Reopen rate: {(reopenData.overall_reopen_rate * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Reopened Categories</span>
                      <div className="mt-2 space-y-1">
                        {reopenData.by_category?.slice(0, 3).map((item) => (
                          <div key={item.category} className="flex justify-between text-xs">
                            <span className="text-slate-600 truncate">{item.category}</span>
                            <span className="font-bold text-slate-900">{item.reopen_count} reopens</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {reopenData.recent_reopen_reasons?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-800 mb-2">Recent Citizen Reopen Justifications</h4>
                      <div className="space-y-2">
                        {reopenData.recent_reopen_reasons.slice(0, 5).map((r, i) => (
                          <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700">{r.grievance_id} ({r.category})</span>
                              <span>{r.reopened_at}</span>
                            </div>
                            <p className="text-slate-800 italic">"{r.reason}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: ROUTING & GEOGRAPHIC */}
          {activeSection === 'routing' && (
            <div className="space-y-6">
              {/* Routing Efficiency Card */}
              {routingData && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h2 className="text-sm font-bold text-slate-900 mb-1">Intelligent Routing & Dispatch Efficiency</h2>
                  <p className="text-[11px] text-slate-500 mb-4">Automation metrics, manual interventions, and assignment latency</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Automation Rate</span>
                      <div className="text-xl font-black text-blue-900 mt-1">
                        {(routingData.automation_rate * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-blue-700">{routingData.automatically_assigned_count} auto assigned</span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Manual Overrides</span>
                      <div className="text-xl font-black text-amber-900 mt-1">
                        {routingData.manually_assigned_count}
                      </div>
                      <span className="text-[10px] text-amber-700">Admin / Officer delegations</span>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <span className="text-[10px] font-bold text-purple-700 uppercase">Reassignments</span>
                      <div className="text-xl font-black text-purple-900 mt-1">
                        {routingData.reassigned_count}
                      </div>
                      <span className="text-[10px] text-purple-700">Workload transfers</span>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Avg Time-To-Assignment</span>
                      <div className="text-xl font-black text-emerald-900 mt-1">
                        {routingData.average_time_to_assignment_minutes !== null
                          ? `${routingData.average_time_to_assignment_minutes} min`
                          : 'Immediate'}
                      </div>
                      <span className="text-[10px] text-emerald-700">Submission to dispatch</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Geographic and Ward Breakdown */}
              {locationsData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Zone Matrix */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Administrative Zone Distribution</h3>
                    <p className="text-[11px] text-slate-500 mb-3">Zonal intake and resolution status</p>
                    <div className="space-y-2">
                      {locationsData.zones?.map((z) => (
                        <div key={z.zone} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{z.zone}</div>
                            <div className="text-[10px] text-slate-500">{z.active} active • {z.resolved} resolved</div>
                          </div>
                          <span className="text-sm font-black text-blue-600">{z.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ward Ranking */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Top Municipal Wards by Volume</h3>
                    <p className="text-[11px] text-slate-500 mb-3">Ward-level civic density</p>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {locationsData.wards?.map((w) => (
                        <div key={w.ward} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{w.ward}</div>
                            <div className="text-[10px] text-slate-400">{w.zone}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{w.total} total</div>
                            <div className="text-[10px] text-amber-600">{w.active} open</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: ML MONITORING & ACTIVE LEARNING */}
          {activeSection === 'ml' && mlData && (
            <div className="space-y-6">
              {/* ML Offline vs Production Agreement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Offline Benchmark */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Offline Benchmark (Held-Out Test Set)</h3>
                      <p className="text-[11px] text-slate-500">Evaluated on {mlData.offline_evaluation?.test_records} synthetic & benchmark records</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Test Accuracy</span>
                      <div className="text-lg font-black text-indigo-900">
                        {((mlData.offline_evaluation?.accuracy || 0) * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                      <span className="text-[10px] font-bold text-purple-700 uppercase">Macro F1</span>
                      <div className="text-lg font-black text-purple-900">
                        {((mlData.offline_evaluation?.macro_f1 || 0) * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Features</span>
                      <div className="text-lg font-black text-blue-900">
                        {mlData.offline_evaluation?.vocabulary_features}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div><span className="font-semibold">Algorithm:</span> {mlData.offline_evaluation?.algorithm}</div>
                    <div><span className="font-semibold">Model Version:</span> v{mlData.offline_evaluation?.artifact_version}</div>
                    <div><span className="font-semibold">Training Timestamp:</span> {mlData.offline_evaluation?.training_date}</div>
                  </div>
                </div>

                {/* Live Feedback Agreement */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Live Production Prediction Agreement</h3>
                      <p className="text-[11px] text-slate-500">Comparison of AI prediction against human officer validation</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Agreement Rate</span>
                      <div className="text-lg font-black text-emerald-900">
                        {mlData.live_feedback_monitoring?.reviewed_prediction_agreement_rate !== null
                          ? `${(mlData.live_feedback_monitoring.reviewed_prediction_agreement_rate * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Reviewed</span>
                      <div className="text-lg font-black text-blue-900">
                        {mlData.live_feedback_monitoring?.reviewed_predictions_count}
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Corrected</span>
                      <div className="text-lg font-black text-rose-900">
                        {mlData.live_feedback_monitoring?.manually_corrected_count}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div><span className="font-semibold">Total Live Classifications:</span> {mlData.live_feedback_monitoring?.total_live_predictions}</div>
                    <div><span className="font-semibold">Auto-Classified:</span> {mlData.live_feedback_monitoring?.auto_classified_count}</div>
                    <div><span className="font-semibold">Review Required Flagged:</span> {mlData.live_feedback_monitoring?.review_required_count}</div>
                  </div>
                </div>
              </div>

              {/* Confidence Distribution Buckets */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Model Softmax Confidence Distribution</h3>
                <p className="text-[11px] text-slate-500 mb-4">Bucketed confidence intervals across all submitted grievances</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(mlData.live_feedback_monitoring?.confidence_distribution_buckets || {}).map(([bucket, count]) => (
                    <div key={bucket} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{bucket}</span>
                      <div className="text-xl font-black text-slate-900 mt-1">{count}</div>
                      <span className="text-[10px] text-slate-400">predictions</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Production Confusion Matrix Grid */}
              {mlData.live_feedback_monitoring?.confusion_matrix && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Category Confusion Matrix (Human Reviewed Records)</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Row = AI Predicted Category, Column = Final Officer-Verified Category</p>

                  <div className="overflow-x-auto">
                    <table className="text-[10px] border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-100 text-left font-bold">Predicted \ Actual</th>
                          {mlData.live_feedback_monitoring.confusion_matrix.labels.map((lbl) => (
                            <th key={lbl} className="p-2 border border-slate-200 bg-slate-50 font-semibold max-w-[90px] truncate" title={lbl}>
                              {lbl.split(' ')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mlData.live_feedback_monitoring.confusion_matrix.labels.map((rowLbl, rowIdx) => (
                          <tr key={rowLbl}>
                            <td className="p-2 border border-slate-200 font-semibold bg-slate-50 whitespace-nowrap">
                              {rowLbl}
                            </td>
                            {mlData.live_feedback_monitoring.confusion_matrix.matrix[rowIdx]?.map((val, colIdx) => (
                              <td
                                key={colIdx}
                                className={`p-2 border border-slate-200 text-center font-bold ${
                                  rowIdx === colIdx
                                    ? val > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-50 text-slate-400'
                                    : val > 0 ? 'bg-rose-100 text-rose-900' : 'text-slate-300'
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: DATA QUALITY & INTEGRITY */}
          {activeSection === 'quality' && dataQuality && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Municipal Data Health & Schema Audit</h2>
                      <p className="text-xs text-slate-500">Automated structural integrity checks over collections</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-black text-emerald-600">
                      {dataQuality.data_health_score_pct}%
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Overall Health Score
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Records Audited</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">{dataQuality.total_records_audited}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Clean Documents</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{dataQuality.clean_records_count}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Detected Anomalies</span>
                    <div className="text-xl font-bold text-rose-600 mt-1">
                      {Object.values(dataQuality.issues_detected || {}).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Audit Freshness</span>
                    <div className="text-xs font-semibold text-slate-700 mt-2 truncate">{dataQuality.audit_timestamp}</div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Integrity Audit Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {Object.entries(dataQuality.issues_detected || {}).map(([issue, count]) => (
                    <div key={issue} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium capitalize">{issue.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        count === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {count} issues
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
