import React, { useState, useEffect } from 'react';
import grievanceApi from '../../api/grievanceApi.js';
import {
  MapPin,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Users,
  Building,
  Layers
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';

export const AdminJurisdictionManagement = () => {
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editJur, setEditJur] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    zone: '',
    headquarters: '',
    wards_input: 'Ward 1, Ward 2, Ward 3'
  });

  const fetchJurisdictions = async () => {
    try {
      setRefreshing(true);
      const data = await grievanceApi.getJurisdictions();
      setJurisdictions(data);
    } catch (err) {
      console.error('Failed to load jurisdictions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJurisdictions();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const wardsList = formData.wards_input
        .split(',')
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      await grievanceApi.createJurisdiction({
        zone: formData.zone,
        headquarters: formData.headquarters,
        wards: wardsList
      });

      showToast(`Zone '${formData.zone}' created successfully.`);
      setCreateModalOpen(false);
      setFormData({ zone: '', headquarters: '', wards_input: '' });
      await fetchJurisdictions();
    } catch (err) {
      console.error('Failed to create zone:', err);
      showToast('Error creating jurisdiction zone.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editJur) return;
    try {
      setSubmitting(true);
      const jid = editJur.jurisdiction_id;
      const wardsList = typeof editJur.wards === 'string'
        ? editJur.wards.split(',').map((w) => w.trim()).filter(Boolean)
        : editJur.wards;

      await grievanceApi.updateJurisdiction(jid, {
        zone: editJur.zone,
        headquarters: editJur.headquarters,
        wards: wardsList
      });

      showToast(`Zone '${editJur.zone}' updated.`);
      setEditJur(null);
      await fetchJurisdictions();
    } catch (err) {
      console.error('Failed to update jurisdiction:', err);
      showToast('Error updating jurisdiction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-jurisdiction-management-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Jurisdictions, Zones & Wards</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Territorial boundaries, zonal subdivisions, ward numbers, and field engineer jurisdiction rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJurisdictions}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Zone</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Jurisdictions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {jurisdictions.map((jur) => {
          const jid = jur.jurisdiction_id;
          const wards = jur.wards || [];
          const assignedOfficers = jur.assigned_officers || [];

          return (
            <div
              key={jid}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-400">{jid}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{jur.zone}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  HQ: {jur.headquarters || 'Zonal Municipal Office'}
                </p>

                <div className="mt-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Included Wards ({wards.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {wards.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>

                {assignedOfficers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Assigned Field Officers ({assignedOfficers.length})</span>
                    </div>
                    <div className="space-y-1">
                      {assignedOfficers.slice(0, 3).map((off, idx) => (
                        <div key={idx} className="text-xs text-slate-700 flex justify-between">
                          <span className="font-medium">{off.name}</span>
                          <span className="text-slate-400">Load: {off.current_workload}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Active Administrative Zone</span>
                </span>

                <button
                  onClick={() => setEditJur({
                    ...jur,
                    wards: jur.wards ? jur.wards.join(', ') : ''
                  })}
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
          title="Create Municipal Jurisdiction Zone"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zone Name *</label>
              <input
                type="text"
                required
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="e.g. Mahadevapura Zone"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zonal Headquarters</label>
              <input
                type="text"
                value={formData.headquarters}
                onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                placeholder="e.g. RHB Colony, Whitefield Main Road"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Wards (Comma Separated)</label>
              <textarea
                rows={3}
                value={formData.wards_input}
                onChange={(e) => setFormData({ ...formData, wards_input: e.target.value })}
                placeholder="Ward 85 - Doddanekkundi, Ward 86 - Marathahalli, Ward 150 - Bellandur"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
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
                {submitting ? 'Creating...' : 'Create Zone'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editJur && (
        <Modal
          isOpen={true}
          onClose={() => setEditJur(null)}
          title={`Edit Jurisdiction: ${editJur.zone}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zone Name</label>
              <input
                type="text"
                required
                value={editJur.zone}
                onChange={(e) => setEditJur({ ...editJur, zone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters</label>
              <input
                type="text"
                value={editJur.headquarters || ''}
                onChange={(e) => setEditJur({ ...editJur, headquarters: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Wards (Comma Separated)</label>
              <textarea
                rows={4}
                value={editJur.wards}
                onChange={(e) => setEditJur({ ...editJur, wards: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditJur(null)}
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

export default AdminJurisdictionManagement;
