import React, { useState } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import grievanceApi from '../../api/grievanceApi.js';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  Phone,
  Mail,
  Shield,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminDepartmentManagement = () => {
  const { departments, refreshGrievances } = useGrievance();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    supported_categories: ['Pothole']
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await grievanceApi.createDepartment(formData);
      showToast(`Department '${formData.name}' created successfully.`);
      setCreateModalOpen(false);
      setFormData({
        name: '',
        department_id: '',
        description: '',
        contact_email: '',
        contact_phone: '',
        supported_categories: ['Pothole']
      });
      await refreshGrievances();
    } catch (err) {
      console.error('Failed to create department:', err);
      showToast('Error creating department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDept) return;
    try {
      setSubmitting(true);
      const did = editDept.id || editDept.department_id;
      await grievanceApi.updateDepartment(did, {
        name: editDept.name,
        description: editDept.description,
        contact_email: editDept.contact_email,
        contact_phone: editDept.contact_phone,
        supported_categories: editDept.supported_categories || editDept.categories || []
      });
      showToast(`Department '${editDept.name}' updated.`);
      setEditDept(null);
      await refreshGrievances();
    } catch (err) {
      console.error('Failed to update department:', err);
      showToast('Failed to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-department-management-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Departments & SLA Directives</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure civic service wings, supported grievance categories, escalation paths, and official contact channels.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(departments || []).map((dept) => {
          const did = dept.id || dept.department_id;
          const categories = dept.supported_categories || dept.categories || [];

          return (
            <div
              key={did}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-400">{did}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {dept.description || 'Civic infrastructure and maintenance division.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  {dept.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{dept.contact_email}</span>
                    </div>
                  )}
                  {dept.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{dept.contact_phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Supported Categories
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Active Directorate</span>
                </span>

                <button
                  onClick={() => setEditDept(dept)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setCreateModalOpen(false)}
          title="Add Municipal Department"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Solid Waste Management Division"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department ID (Optional)</label>
              <input
                type="text"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                placeholder="e.g. MSEDCL-POWER-SUPPLY"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Official mandate and scope..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="dept@bbmp.gov.in"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+91 80 2222 1111"
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
                {submitting ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editDept && (
        <Modal
          isOpen={true}
          onClose={() => setEditDept(null)}
          title={`Edit Department: ${editDept.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department Name</label>
              <input
                type="text"
                required
                value={editDept.name}
                onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={editDept.description || ''}
                onChange={(e) => setEditDept({ ...editDept, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editDept.contact_email || ''}
                  onChange={(e) => setEditDept({ ...editDept, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editDept.contact_phone || ''}
                  onChange={(e) => setEditDept({ ...editDept, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditDept(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Save Department'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminDepartmentManagement;
