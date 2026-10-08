import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi.js';
import { grievanceApi } from '../../api/grievanceApi.js';

export const AdminReports = ({ onNavigateAnalytics }) => {
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [departmentsList, setDepartmentsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch departments for filter
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

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.generateReport({
        report_type: reportType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        department_id: selectedDept !== 'ALL' ? selectedDept : undefined
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate official report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, selectedDept]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = async () => {
    let datasetType = 'grievances';
    if (reportType === 'department-performance') datasetType = 'departments';
    else if (reportType === 'officer-workload') datasetType = 'officers';
    else if (reportType === 'category-demand') datasetType = 'categories';

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
      link.setAttribute('download', `grievancehub_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar (Hidden on print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Official Municipal Intelligence Reports
                </h1>
                <p className="text-xs text-slate-500">
                  Standardized governance reports, SLA audit tables, and active learning diagnostics
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Raw CSV</span>
            </button>

            {onNavigateAnalytics && (
              <button
                onClick={onNavigateAnalytics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Interactive Charts</span>
              </button>
            )}
          </div>
        </div>

        {/* Report Selector & Date Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Report Template</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="summary">1. Executive Grievance Summary</option>
              <option value="department-performance">2. Department Performance & SLA</option>
              <option value="officer-workload">3. Workforce Capacity & Workload</option>
              <option value="category-demand">4. Civic Demand & Category Breakdown</option>
              <option value="ml-feedback">5. ML Model & Production Feedback</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department Scope</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Municipal Departments</option>
              {departmentsList.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Report Generation Error:</span> {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-600">Compiling official municipal report from database records...</p>
        </div>
      )}

      {/* Official Report Document Canvas */}
      {!loading && reportData && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-slate-900 print:border-none print:shadow-none print:p-0">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                GOVERNMENT OF INDIA • MUNICIPAL CORPORATION
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {reportData.report_title}
              </h2>
              <div className="text-xs text-slate-600 mt-1">
                Data Source: <span className="font-semibold">{reportData.data_source}</span>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <div><span className="font-semibold text-slate-800">Report Reference:</span> {reportData.report_id}</div>
              <div><span className="font-semibold text-slate-800">Generated:</span> {reportData.generated_at}</div>
              <div><span className="font-semibold text-slate-800">Time Range:</span> {reportData.date_range}</div>
            </div>
          </div>

          {/* REPORT CONTENT: EXECUTIVE SUMMARY */}
          {reportType === 'summary' && reportData.overview_metrics && (
            <div className="space-y-6">
              {/* Executive Summary Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Grievances</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{reportData.overview_metrics.total_grievances}</div>
                  <span className="text-[11px] text-slate-500">{reportData.overview_metrics.new_grievances} new submissions</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Workload</span>
                  <div className="text-2xl font-black text-amber-600 mt-1">{reportData.overview_metrics.open_grievances}</div>
                  <span className="text-[11px] text-slate-500">{reportData.overview_metrics.in_progress} in progress</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Resolution</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {reportData.overview_metrics.average_resolution_hours !== null ? `${reportData.overview_metrics.average_resolution_hours} hrs` : 'N/A'}
                  </div>
                  <span className="text-[11px] text-slate-500">{reportData.overview_metrics.resolved + reportData.overview_metrics.closed} resolved</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reopen Rate</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {(reportData.overview_metrics.overall_reopen_rate * 100).toFixed(1)}%
                  </div>
                  <span className="text-[11px] text-slate-500">{reportData.overview_metrics.reopened} reopened</span>
                </div>
              </div>

              {/* Status Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Lifecycle Status Distribution
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3 font-bold">Status Stage</th>
                        <th className="py-2 px-3 font-bold text-right">Count</th>
                        <th className="py-2 px-3 font-bold text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(reportData.overview_metrics.status_distribution || {}).map(([st, cnt]) => {
                        const total = reportData.overview_metrics.total_grievances || 1;
                        const pct = ((cnt / total) * 100).toFixed(1);
                        return (
                          <tr key={st} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">{st.replace('_', ' ')}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">{cnt}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT CONTENT: DEPARTMENT PERFORMANCE */}
          {reportType === 'department-performance' && reportData.records && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Department Name</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total Cases</th>
                      <th className="py-2.5 px-3 font-bold text-right">Active Backlog</th>
                      <th className="py-2.5 px-3 font-bold text-right">Resolved</th>
                      <th className="py-2.5 px-3 font-bold text-right">Avg Resolution (Hrs)</th>
                      <th className="py-2.5 px-3 font-bold text-right">Reopen Rate</th>
                      <th className="py-2.5 px-3 font-bold text-right">Capacity Saturation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.map((d) => (
                      <tr key={d.department_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{d.name}</div>
                          <div className="text-[10px] text-slate-400">{d.department_id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{d.total}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">{d.active}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{d.resolved + d.closed}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                          {d.average_resolution_hours !== null ? `${d.average_resolution_hours} hrs` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {(d.reopen_rate * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {d.capacity_utilization_pct !== null ? `${d.capacity_utilization_pct}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT CONTENT: WORKFORCE CAPACITY */}
          {reportType === 'officer-workload' && reportData.records && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Officer Name</th>
                      <th className="py-2.5 px-3 font-bold">Department</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                      <th className="py-2.5 px-3 font-bold text-right">Active Cases</th>
                      <th className="py-2.5 px-3 font-bold text-right">Max Load</th>
                      <th className="py-2.5 px-3 font-bold text-right">Utilization (%)</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.map((o) => (
                      <tr key={o.officer_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{o.name}</div>
                          <div className="text-[10px] text-slate-400">{o.officer_id} • {o.designation}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{o.department}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-700">{o.availability_status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{o.active_cases}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{o.maximum_capacity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                          {o.utilization_percentage !== null ? `${o.utilization_percentage}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{o.resolved_cases + o.closed_cases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT CONTENT: CATEGORY DEMAND */}
          {reportType === 'category-demand' && reportData.records && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Category</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total Volume</th>
                      <th className="py-2.5 px-3 font-bold text-right">Active Backlog</th>
                      <th className="py-2.5 px-3 font-bold text-right">Resolved</th>
                      <th className="py-2.5 px-3 font-bold text-right">Officer Corrections</th>
                      <th className="py-2.5 px-3 font-bold text-right">Avg Confidence</th>
                      <th className="py-2.5 px-3 font-bold text-right">Avg Resolution (Hrs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{c.category}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{c.count}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">{c.active}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{c.resolved + c.closed}</td>
                        <td className="py-2.5 px-3 text-right text-purple-700 font-semibold">{c.corrected_count}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {c.average_confidence !== null ? `${(c.average_confidence * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                          {c.average_resolution_hours !== null ? `${c.average_resolution_hours} hrs` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT CONTENT: ML FEEDBACK */}
          {reportType === 'ml-feedback' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Offline Test Metrics</h4>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div><span className="font-semibold">Model Name:</span> {reportData.offline_evaluation?.model_name}</div>
                    <div><span className="font-semibold">Algorithm:</span> {reportData.offline_evaluation?.algorithm}</div>
                    <div><span className="font-semibold">Artifact Version:</span> {reportData.offline_evaluation?.artifact_version}</div>
                    <div><span className="font-semibold">Test Accuracy:</span> {((reportData.offline_evaluation?.accuracy || 0) * 100).toFixed(2)}%</div>
                    <div><span className="font-semibold">Macro F1 Score:</span> {((reportData.offline_evaluation?.macro_f1 || 0) * 100).toFixed(2)}%</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Live Production Metrics</h4>
                  <div className="text-xs space-y-1 text-slate-600">
                    <div><span className="font-semibold">Live Inferences:</span> {reportData.live_feedback?.total_live_predictions}</div>
                    <div><span className="font-semibold">Auto-Classified:</span> {reportData.live_feedback?.auto_classified_count}</div>
                    <div><span className="font-semibold">Human Corrections:</span> {reportData.live_feedback?.manually_corrected_count}</div>
                    <div><span className="font-semibold">Human-AI Agreement:</span> {
                      reportData.live_feedback?.reviewed_prediction_agreement_rate !== null
                        ? `${(reportData.live_feedback?.reviewed_prediction_agreement_rate * 100).toFixed(1)}%`
                        : 'N/A'
                    }</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Official Sign-off Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Audit & Compliance Notice</p>
              <p className="mt-1 text-[11px]">
                This document is generated programmatically from immutable system audit logs. All timestamps are in UTC.
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block text-center pt-8 border-t border-slate-400 min-w-[180px]">
                <p className="font-bold text-slate-800">Municipal Commissioner</p>
                <p className="text-[10px] text-slate-500">Administrative Authority</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
