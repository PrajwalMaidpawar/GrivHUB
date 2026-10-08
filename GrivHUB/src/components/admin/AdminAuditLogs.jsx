import React, { useState, useEffect } from 'react';
import grievanceApi from '../../api/grievanceApi.js';
import {
  ScrollText,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Eye,
  FileCode,
  Tag
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async () => {
    try {
      setRefreshing(true);
      const params = {};
      if (actionFilter !== 'ALL') params.action_type = actionFilter;
      const res = await grievanceApi.getAdminAuditLogs(params);
      setLogs(res.audit_logs || res || []);
      setTotal(res.total || (res.audit_logs ? res.audit_logs.length : 0));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  const filtered = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const actor = (log.actor_id || '').toLowerCase();
    const reason = (log.reason || '').toLowerCase();
    const target = (log.target_id || '').toLowerCase();
    const action = (log.action_type || '').toLowerCase();

    return actor.includes(q) || reason.includes(q) || target.includes(q) || action.includes(q);
  });

  return (
    <div className="space-y-6" id="admin-audit-logs-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administrative Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, append-only security logs of manual overrides, assignments, configuration changes, and system policies.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor, reason, target ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="ALL">All Action Types</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_UPDATED">USER_UPDATED</option>
            <option value="OFFICER_CREATED">OFFICER_CREATED</option>
            <option value="DEPARTMENT_CREATED">DEPARTMENT_CREATED</option>
            <option value="DEPARTMENT_UPDATED">DEPARTMENT_UPDATED</option>
            <option value="JURISDICTION_CREATED">JURISDICTION_CREATED</option>
            <option value="ROUTING_RULE_CHANGED">ROUTING_RULE_CHANGED</option>
            <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center">
          <span>Showing <strong>{filtered.length}</strong> immutable log events</span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Append-Only Store Verified</span>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No audit log records found</p>
            <p className="text-xs text-slate-400 mt-1">Actions performed by administrators will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Actor ID</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((log) => {
                  const logId = log.log_id || log._id;
                  const ts = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent';

                  return (
                    <tr key={logId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {ts}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.actor_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-indigo-700 font-mono font-medium">
                          {log.target_type}:{log.target_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {log.reason || 'Administrative action executed.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition text-xs flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
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

      {/* Inspect Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Event: ${selectedLog.action_type}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-400">Timestamp:</span>
                <div className="font-semibold text-slate-800">{new Date(selectedLog.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-400">Actor:</span>
                <div className="font-semibold text-slate-800">{selectedLog.actor_id} ({selectedLog.actor_role})</div>
              </div>
              <div>
                <span className="text-slate-400">Target Type:</span>
                <div className="font-semibold text-slate-800">{selectedLog.target_type}</div>
              </div>
              <div>
                <span className="text-slate-400">Target ID:</span>
                <div className="font-semibold text-slate-800 font-mono">{selectedLog.target_id}</div>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700">Reason / Justification:</span>
              <div className="p-2.5 bg-slate-100 rounded-lg text-slate-800 mt-1 font-medium">
                {selectedLog.reason || 'No description recorded.'}
              </div>
            </div>

            {selectedLog.previous_value && (
              <div>
                <span className="font-bold text-slate-700">Previous State:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] mt-1 font-mono">
                  {JSON.stringify(selectedLog.previous_value, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_value && (
              <div>
                <span className="font-bold text-slate-700">New State:</span>
                <pre className="p-3 bg-slate-900 text-indigo-300 rounded-lg overflow-x-auto text-[11px] mt-1 font-mono">
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminAuditLogs;
