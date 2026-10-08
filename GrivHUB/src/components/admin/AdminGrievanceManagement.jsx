import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import { Modal } from '../common/Modal.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  Search,
  UserCheck,
  ShieldAlert,
  Filter,
  RefreshCw,
  Edit3,
  Sliders,
  CheckCircle,
  XCircle,
  CornerDownRight,
  Sparkles,
  ArrowRight,
  Eye,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

export const AdminGrievanceManagement = ({
  onViewGrievance
}) => {
  const { grievances, departments, refreshGrievances } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [officersList, setOfficersList] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);

  // Modals state
  const [assignModalGrievance, setAssignModalGrievance] = useState(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [overrideModalGrievance, setOverrideModalGrievance] = useState(null);
  const [overrideAction, setOverrideAction] = useState('CLOSE'); // 'CLOSE' or 'REJECT'
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const [categoryModalGrievance, setCategoryModalGrievance] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [categoryReason, setCategoryReason] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  // Load officers for assignment
  const loadOfficers = async () => {
    try {
      setLoadingOfficers(true);
      const data = await grievanceApi.getOfficers({ active_only: true });
      setOfficersList(data.officers || data || []);
    } catch (err) {
      console.error('Failed to load officers list:', err);
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Filtered grievances
  const filtered = (grievances || []).filter((g) => {
    const gid = (g.id || g.grievance_id || '').toLowerCase();
    const title = (g.title || '').toLowerCase();
    const citizen = (g.citizenName || g.citizen_name || '').toLowerCase();
    const ward = (g.location?.ward || g.ward || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = gid.includes(q) || title.includes(q) || citizen.includes(q) || ward.includes(q);
    const matchesDept = deptFilter === 'ALL' || (g.departmentId || g.department_id) === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || g.priority === priorityFilter;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  // Handle Manual Assignment or Reassignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalGrievance || !selectedOfficerId) return;

    try {
      setSubmittingAssign(true);
      const isReassign = !!(assignModalGrievance.assigned_officer_id || assignModalGrievance.officerId);
      const gid = assignModalGrievance.id || assignModalGrievance.grievance_id;

      if (isReassign) {
        await grievanceApi.reassignGrievance(gid, selectedOfficerId, assignReason || 'Administrative reassignment by System Admin');
        showToast(`Grievance ${gid} successfully reassigned.`);
      } else {
        await grievanceApi.assignGrievance(gid, selectedOfficerId, assignReason || 'Direct manual assignment by System Admin');
        showToast(`Grievance ${gid} successfully assigned to officer.`);
      }

      setAssignModalGrievance(null);
      setSelectedOfficerId('');
      setAssignReason('');
      await refreshGrievances();
      await loadOfficers();
    } catch (err) {
      console.error('Assignment failed:', err);
      showToast('Failed to assign officer. Please check workload limits.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle Administrative Close or Reject
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModalGrievance) return;

    try {
      setSubmittingOverride(true);
      const gid = overrideModalGrievance.id || overrideModalGrievance.grievance_id;

      if (overrideAction === 'CLOSE') {
        await grievanceApi.closeGrievance(gid, overrideReason || 'Closed administratively by Municipal System Administrator.');
        showToast(`Grievance ${gid} administratively closed.`);
      } else if (overrideAction === 'REJECT') {
        await grievanceApi.rejectGrievance(gid, overrideReason || 'Rejected administratively due to policy violations or invalid submission.');
        showToast(`Grievance ${gid} rejected.`);
      }

      setOverrideModalGrievance(null);
      setOverrideReason('');
      await refreshGrievances();
    } catch (err) {
      console.error('Status override failed:', err);
      showToast('Failed to override grievance status.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Handle Category Correction
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryModalGrievance || !newCategory) return;

    try {
      setSubmittingCategory(true);
      const gid = categoryModalGrievance.id || categoryModalGrievance.grievance_id;
      await grievanceApi.correctCategory(
        gid,
        newCategory,
        categoryReason || 'Administrative category reclassification after AI classification review.'
      );

      showToast(`Category for ${gid} updated to ${newCategory}.`);
      setCategoryModalGrievance(null);
      setNewCategory('');
      setCategoryReason('');
      await refreshGrievances();
    } catch (err) {
      console.error('Category correction failed:', err);
      showToast('Failed to update category.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const CATEGORIES = [
    'Pothole',
    'Garbage',
    'Streetlight',
    'Water Supply',
    'Drainage',
    'Traffic',
    'Encroachment'
  ];

  return (
    <div className="space-y-6" id="admin-grievance-management-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grievance Operations & Administrative Overrides</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full operational lifecycle oversight, manual workload routing, category corrections, and administrative closure.
          </p>
        </div>

        <button
          onClick={refreshGrievances}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Database</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Grievance ID, title, citizen name, or ward..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d.department_id} value={d.id || d.department_id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(searchQuery || deptFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDeptFilter('ALL');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Grievances Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing <strong>{filtered.length}</strong> grievances</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No grievances match active filters</p>
            <p className="text-xs text-slate-400 mt-1">Try refining your search terms or clearing status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Grievance ID</th>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4 text-right">Admin Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((g) => {
                  const gid = g.id || g.grievance_id;
                  const officerName = g.officerName || g.assigned_officer_id;
                  const deptObj = (departments || []).find((d) => (d.id || d.department_id) === (g.departmentId || g.department_id));

                  return (
                    <tr key={gid} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {gid}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{g.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Ward: {g.location?.ward || g.ward || 'N/A'}</span>
                          <span>•</span>
                          <span>{g.citizenName || g.citizen_name || 'Citizen'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{g.finalCategoryName || g.category}</span>
                          <button
                            onClick={() => {
                              setCategoryModalGrievance(g);
                              setNewCategory(g.finalCategoryName || g.category);
                            }}
                            title="Correct Category"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 font-medium">{deptObj?.name || g.departmentId || g.department_id || 'Pending'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={g.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={g.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        {officerName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{officerName}</span>
                            <button
                              onClick={() => {
                                setAssignModalGrievance(g);
                                setSelectedOfficerId(g.assigned_officer_id || g.officerId || '');
                              }}
                              title="Reassign Officer"
                              className="text-[10px] text-indigo-600 hover:underline font-semibold"
                            >
                              Reassign
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssignModalGrievance(g);
                              setSelectedOfficerId('');
                            }}
                            className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] hover:bg-amber-200 transition"
                          >
                            + Assign Officer
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewGrievance(gid)}
                            title="Inspect Grievance Detail"
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>

                          {g.status !== 'CLOSED' && g.status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                setOverrideModalGrievance(g);
                                setOverrideAction('CLOSE');
                              }}
                              title="Administrative Override"
                              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition text-xs"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Assignment / Reassignment Modal */}
      {assignModalGrievance && (
        <Modal
          isOpen={true}
          onClose={() => setAssignModalGrievance(null)}
          title={assignModalGrievance.assigned_officer_id || assignModalGrievance.officerId ? 'Reassign Municipal Officer' : 'Assign Municipal Officer'}
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grievance</label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{assignModalGrievance.id || assignModalGrievance.grievance_id} — {assignModalGrievance.title}</div>
                <div className="text-slate-500 mt-0.5">Category: {assignModalGrievance.finalCategoryName || assignModalGrievance.category} | Ward: {assignModalGrievance.location?.ward || 'General'}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Field Officer *</label>
              <select
                required
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                <option value="">-- Choose Officer --</option>
                {officersList.map((off) => (
                  <option key={off.officer_id} value={off.officer_id}>
                    {off.name} ({off.department_id}) — Load: {off.current_workload || 0}/{off.maximum_workload || 10} [{off.availability_status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assignment / Reassignment Reason *</label>
              <textarea
                required
                rows={3}
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="State the administrative justification for this assignment..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalGrievance(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAssign || !selectedOfficerId}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Administrative Status Override Modal */}
      {overrideModalGrievance && (
        <Modal
          isOpen={true}
          onClose={() => setOverrideModalGrievance(null)}
          title="Administrative Status Override"
        >
          <form onSubmit={handleOverrideSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="font-bold">Administrative Override Warning</div>
              <p className="mt-0.5">This action will immediately change the lifecycle status of <strong>{overrideModalGrievance.id || overrideModalGrievance.grievance_id}</strong> and record an immutable entry in the audit trail.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideAction('CLOSE')}
                  className={`p-3 rounded-lg border text-xs font-bold text-left transition ${
                    overrideAction === 'CLOSE'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 mb-1" />
                  <div>Administrative Close</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">Close complaint with final executive resolution</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideAction('REJECT')}
                  className={`p-3 rounded-lg border text-xs font-bold text-left transition ${
                    overrideAction === 'REJECT'
                      ? 'border-rose-600 bg-rose-50 text-rose-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600 mb-1" />
                  <div>Reject Grievance</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">Mark invalid, out of scope, or fraudulent</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Reason *</label>
              <textarea
                required
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain the administrative reason for this override..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModalGrievance(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOverride || !overrideReason}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submittingOverride ? 'Executing...' : 'Apply Override'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Category Correction Modal */}
      {categoryModalGrievance && (
        <Modal
          isOpen={true}
          onClose={() => setCategoryModalGrievance(null)}
          title="Correct AI Classification Category"
        >
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grievance</label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{categoryModalGrievance.title}</div>
                <div className="text-slate-500 mt-1">{categoryModalGrievance.description}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Correct Category *</label>
              <select
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correction Reason *</label>
              <textarea
                required
                rows={2}
                value={categoryReason}
                onChange={(e) => setCategoryReason(e.target.value)}
                placeholder="Reason for changing AI category..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryModalGrievance(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingCategory}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submittingCategory ? 'Saving...' : 'Update Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminGrievanceManagement;
