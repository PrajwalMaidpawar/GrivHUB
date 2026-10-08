import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  Sliders,
  CheckCircle2,
  RefreshCw,
  Edit2,
  ArrowRight,
  Shield,
  Layers,
  History,
  Info
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminRoutingManagement = () => {
  const { departments, refreshGrievances } = useGrievance();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchRules = async () => {
    try {
      setRefreshing(true);
      const data = await grievanceApi.getAdminRoutingRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load routing rules:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleUpdateRule = async (e) => {
    e.preventDefault();
    if (!editRule || !targetDeptId) return;

    try {
      setSubmitting(true);
      await grievanceApi.updateAdminRoutingRule(
        editRule.category,
        targetDeptId,
        changeReason || 'Administrative routing policy adjustment.'
      );

      showToast(`Routing rule for '${editRule.category}' updated to department '${targetDeptId}'.`);
      setEditRule(null);
      setTargetDeptId('');
      setChangeReason('');
      await fetchRules();
      await refreshGrievances();
    } catch (err) {
      console.error('Failed to update rule:', err);
      showToast('Error updating routing rule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-routing-management-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Intelligent Routing Engine Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default category-to-department deterministic routing directives and SLA mapping policies.
          </p>
        </div>

        <button
          onClick={fetchRules}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Rules</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900">
          <strong>Deterministic Routing Architecture:</strong> When a grievance is submitted by a citizen, the ML classification model identifies the civic category. The routing engine consults this active mapping table to automatically assign the complaint to the designated municipal department and dispatch it to an available field engineer within the citizen's jurisdiction.
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
          Active Category Dispatch Rules ({rules.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Civic Category</th>
                <th className="py-3 px-4">Target Department</th>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Default Priority</th>
                <th className="py-3 px-4">SLA Target</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.map((rule, idx) => {
                const deptObj = (departments || []).find((d) => (d.id || d.department_id) === rule.department_id);

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rule.category}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-700">
                      {rule.department_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {deptObj?.name || rule.department_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rule.default_priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                        rule.default_priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.default_priority || 'HIGH'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {rule.sla_hours || 48} Hours
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {rule.updated_at ? new Date(rule.updated_at).toLocaleDateString() : 'System Default'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditRule(rule);
                          setTargetDeptId(rule.department_id);
                          setChangeReason('');
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition text-xs flex items-center gap-1 ml-auto"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Change Mapping</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editRule && (
        <Modal
          isOpen={true}
          onClose={() => setEditRule(null)}
          title={`Configure Routing Rule: ${editRule.category}`}
        >
          <form onSubmit={handleUpdateRule} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="font-bold text-slate-900">Category: {editRule.category}</div>
              <div className="text-slate-500 mt-0.5">Current Department: {editRule.department_id}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Department *</label>
              <select
                required
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id || d.department_id} value={d.id || d.department_id}>
                    {d.name} ({d.id || d.department_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Administrative Justification / Reason *</label>
              <textarea
                required
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Reason for modifying default routing dispatch policy..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditRule(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !targetDeptId || !changeReason}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Save Routing Rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminRoutingManagement;
