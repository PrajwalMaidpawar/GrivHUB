import React, { useState, useEffect } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  UserCheck,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Shield,
  MapPin,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Activity
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminOfficerManagement = () => {
  const { departments } = useGrievance();
  const [officers, setOfficersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editOfficer, setEditOfficer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State for create
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    designation: 'Assistant Electrical Engineer',
    maximum_workload: 10,
    availability_status: 'AVAILABLE',
    assigned_jurisdictions: [{ zone: '*', ward: '*' }]
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchOfficers = async () => {
    try {
      setRefreshing(true);
      const res = await grievanceApi.getOfficers();
      const list = res.officers || res || [];
      setOfficersList(list);
    } catch (err) {
      console.error('Failed to load officers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await grievanceApi.createOfficer(formData);
      showToast(`Officer '${formData.name}' created successfully.`);
      setCreateModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        department_id: '',
        designation: 'Assistant Electrical Engineer',
        maximum_workload: 10,
        availability_status: 'AVAILABLE',
        assigned_jurisdictions: [{ zone: '*', ward: '*' }]
      });
      await fetchOfficers();
    } catch (err) {
      console.error('Error creating officer:', err);
      showToast('Failed to create officer. Check email or required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editOfficer) return;
    try {
      setSubmitting(true);
      await grievanceApi.updateOfficerProfile(editOfficer.officer_id, {
        name: editOfficer.name,
        email: editOfficer.email,
        phone: editOfficer.phone,
        designation: editOfficer.designation,
        department_id: editOfficer.department_id,
        maximum_workload: Number(editOfficer.maximum_workload),
        availability_status: editOfficer.availability_status,
        active: editOfficer.active
      });
      showToast(`Officer '${editOfficer.name}' updated.`);
      setEditOfficer(null);
      await fetchOfficers();
    } catch (err) {
      console.error('Error updating officer:', err);
      showToast('Failed to update officer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (officer) => {
    const nextStatus = officer.availability_status === 'AVAILABLE' ? 'ON_LEAVE' : 'AVAILABLE';
    try {
      await grievanceApi.updateOfficerAvailability(officer.officer_id, nextStatus);
      showToast(`${officer.name} marked as ${nextStatus}.`);
      await fetchOfficers();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const filtered = officers.filter((off) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (off.name || '').toLowerCase().includes(q) ||
      (off.email || '').toLowerCase().includes(q) ||
      (off.officer_id || '').toLowerCase().includes(q) ||
      (off.designation || '').toLowerCase().includes(q);

    const matchesDept = deptFilter === 'ALL' || off.department_id === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || off.availability_status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6" id="admin-officer-management-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Officer Roster & Capacity</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage field engineers, workload caps, zone assignments, and availability statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOfficers}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Induct New Officer</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search officer name, designation, email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <option value="AVAILABLE">Available</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="FIELD_DUTY">Field Duty</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Officer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((off) => {
          const load = off.current_workload || 0;
          const max = off.maximum_workload || 10;
          const pct = Math.min(100, Math.round((load / max) * 100));
          const isOverloaded = load >= max;
          const isAvailable = off.availability_status === 'AVAILABLE';

          return (
            <div
              key={off.officer_id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{off.name}</h3>
                    <div className="text-xs text-indigo-600 font-medium">{off.designation}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{off.officer_id}</div>
                  </div>

                  <button
                    onClick={() => handleToggleAvailability(off)}
                    title="Click to toggle availability"
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                    <span>{off.availability_status}</span>
                  </button>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-semibold text-slate-800">{off.department_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{off.email}</span>
                  </div>
                  {off.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-medium text-slate-700">{off.phone}</span>
                    </div>
                  )}
                </div>

                {/* Workload Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Workload Saturation</span>
                    <span className={`font-bold ${isOverloaded ? 'text-rose-600' : 'text-slate-900'}`}>
                      {load} / {max} Active ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Status: {off.active !== false ? 'Active Staff' : 'Deactivated'}
                </span>

                <button
                  onClick={() => setEditOfficer(off)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Officer Modal */}
      {createModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setCreateModalOpen(false)}
          title="Induct New Municipal Officer"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Er. Ramesh Patil"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="officer@bbmp.gov.in"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id || d.department_id} value={d.id || d.department_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation *</label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Workload Capacity (1-50)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maximum_workload}
                  onChange={(e) => setFormData({ ...formData, maximum_workload: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Save & Induct Officer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Officer Modal */}
      {editOfficer && (
        <Modal
          isOpen={true}
          onClose={() => setEditOfficer(null)}
          title={`Edit Officer: ${editOfficer.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editOfficer.name}
                  onChange={(e) => setEditOfficer({ ...editOfficer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={editOfficer.designation}
                  onChange={(e) => setEditOfficer({ ...editOfficer, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Workload Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editOfficer.maximum_workload || 10}
                  onChange={(e) => setEditOfficer({ ...editOfficer, maximum_workload: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Availability Status</label>
                <select
                  value={editOfficer.availability_status}
                  onChange={(e) => setEditOfficer({ ...editOfficer, availability_status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="FIELD_DUTY">FIELD_DUTY</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="officerActive"
                checked={editOfficer.active !== false}
                onChange={(e) => setEditOfficer({ ...editOfficer, active: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="officerActive" className="text-xs font-semibold text-slate-700">
                Active Staff Member
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOfficer(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminOfficerManagement;
