import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import {
  Briefcase,
  Gauge,
  Users,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  ShieldCheck
} from 'lucide-react';

export const OfficerWorkload = ({ onViewGrievance }) => {
  const { currentUser } = useAuth();
  const {
    grievances,
    fetchOfficerWorkload,
    fetchOfficers,
    departments,
    updateOfficerAvailability
  } = useGrievance();
  const { t } = useI18n();

  const [workloadData, setWorkloadData] = useState(null);
  const [peerOfficers, setPeerOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Active grievances for this officer
  const myGrievances = grievances.filter(
    (g) => g.assignedOfficerId === currentUser.id || (!g.assignedOfficerId && g.departmentId === currentUser.departmentId)
  );

  const activeCases = myGrievances.filter(
    (g) => g.status === 'ASSIGNED' || g.status === 'IN_PROGRESS' || g.status === 'REOPENED'
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wl, peers] = await Promise.all([
        fetchOfficerWorkload(currentUser.id || 'OFF-ROADS-001'),
        fetchOfficers({ department_id: currentUser.departmentId })
      ]);
      setWorkloadData(wl);
      setPeerOfficers(peers || []);
    } catch (err) {
      console.warn('Failed to fetch workload details:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchOfficerWorkload, fetchOfficers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAvailabilityChange = async (newStatus) => {
    setUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await updateOfficerAvailability(currentUser.id || 'OFF-ROADS-001', newStatus);
      setStatusMessage({ type: 'success', text: `Availability status updated to ${newStatus}.` });
      await loadData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update availability status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const maxCapacity = workloadData?.maximum_workload || currentUser.maxWorkload || 15;
  const currentCount = workloadData?.active_workload ?? activeCases.length;
  const availableSlots = Math.max(0, maxCapacity - currentCount);
  const utilizationPercent = Math.min(100, Math.round((currentCount / maxCapacity) * 100));

  const dept = departments.find((d) => d.id === currentUser.departmentId || d.department_id === currentUser.departmentId);

  const casesByStatus = {
    assigned: activeCases.filter((g) => g.status === 'ASSIGNED').length,
    inProgress: activeCases.filter((g) => g.status === 'IN_PROGRESS').length,
    reopened: activeCases.filter((g) => g.status === 'REOPENED').length
  };

  return (
    <div className="space-y-6" id="officer-workload-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Officer Workload & Capacity Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time active case distribution and dispatch capacity across {dept?.name || 'Department'}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Capacity Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Utilization Meter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Active Utilization</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{currentCount}</span>
            <span className="text-xs text-slate-500">/ {maxCapacity} Max Tasks</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                utilizationPercent >= 85
                  ? 'bg-rose-600'
                  : utilizationPercent >= 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>{utilizationPercent}% Capacity</span>
            <span className="font-semibold text-slate-700">{availableSlots} Available Slots</span>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Active Case Breakdown</span>
            <Briefcase className="w-4 h-4 text-slate-500" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-lg font-bold text-blue-800">{casesByStatus.assigned}</span>
              <p className="text-[10px] text-blue-700 font-medium mt-0.5">Assigned</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-lg font-bold text-amber-800">{casesByStatus.inProgress}</span>
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">In Progress</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-lg font-bold text-rose-800">{casesByStatus.reopened}</span>
              <p className="text-[10px] text-rose-700 font-medium mt-0.5">Reopened</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2.5">
            {casesByStatus.reopened > 0 ? (
              <span className="text-rose-700 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Priority attention required on reopened cases
              </span>
            ) : (
              'All tasks progressing normally within SLA bounds.'
            )}
          </p>
        </div>

        {/* Availability Switcher */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Routing Availability Status</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Affects automated ML grievance routing engine assignment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { id: 'AVAILABLE', label: 'Available', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
              { id: 'BUSY', label: 'Busy (High Load)', color: 'border-amber-300 text-amber-800 bg-amber-50' },
              { id: 'UNAVAILABLE', label: 'Unavailable', color: 'border-slate-300 text-slate-800 bg-slate-50' },
              { id: 'ON_LEAVE', label: 'On Leave', color: 'border-rose-300 text-rose-800 bg-rose-50' }
            ].map((st) => {
              const isSelected = (currentUser.availabilityStatus || 'AVAILABLE') === st.id;
              return (
                <button
                  key={st.id}
                  disabled={updatingStatus}
                  onClick={() => handleAvailabilityChange(st.id)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all text-center ${
                    isSelected
                      ? `${st.color} ring-2 ring-blue-500/20 font-bold`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Workload List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Current Assigned Workload Roster</h2>
            <p className="text-xs text-slate-500">Live active cases assigned to your field jurisdiction</p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-700">
            {activeCases.length} Active Records
          </span>
        </div>

        {activeCases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">No active cases currently pending.</p>
            <p className="text-slate-400 mt-0.5">Your work capacity is available for new incoming civic complaints.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Grievance Details</th>
                  <th className="px-4 py-3">Location / Ward</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCases.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => onViewGrievance(g.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-mono text-xs font-bold text-blue-700">{g.grievanceNumber}</div>
                      <div className="font-semibold text-slate-900 text-xs mt-0.5 max-w-sm line-clamp-1">
                        {g.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Category: {g.finalCategoryName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <div className="font-medium">{g.location?.serviceArea || g.location?.ward || 'Pune Urban Service Area'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{g.location?.locality}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={g.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(g.submittedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewGrievance(g.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Peer Load Overview */}
      {peerOfficers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Department Peer Officers Workload</h2>
            </div>
            <span className="text-xs text-slate-400">
              {peerOfficers.length} Officers in {dept?.name || 'Department'}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {peerOfficers.map((peer) => {
              const peerLoad = peer.current_workload ?? peer.currentWorkload ?? 0;
              const peerMax = peer.maximum_workload ?? peer.maxWorkload ?? 15;
              const peerPercent = Math.min(100, Math.round((peerLoad / peerMax) * 100));
              const isCurrent = peer.officer_id === currentUser.id || peer.user_id === currentUser.id;

              return (
                <div
                  key={peer.officer_id || peer.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {peer.name || peer.fullName}
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                        {peer.designation}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        peer.availability_status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {peer.availability_status || 'AVAILABLE'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-1">
                      <span>Workload Utilization</span>
                      <span>{peerLoad} / {peerMax} ({peerPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          peerPercent >= 85 ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${peerPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
