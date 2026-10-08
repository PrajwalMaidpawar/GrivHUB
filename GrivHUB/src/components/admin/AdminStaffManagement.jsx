import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../../api/authApi.js';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Copy,
  Check,
  Send,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const AdminStaffManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending', 'approved', 'all', 'invitations'
  const [staffList, setStaffList] = useState([]);
  const [invitationsList, setInvitationsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');

  // Modals & Action State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject'|'suspend'|'reactivate'|'view', staff: obj }
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // New Admin Invitation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('Executive Administrator');
  const [inviteDepartment, setInviteDepartment] = useState('ADMINISTRATION');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (deptFilter) params.department = deptFilter;
      if (circleFilter) params.circle = circleFilter;

      const data = await authApi.getStaffList(params);
      setStaffList(Array.isArray(data) ? data : []);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load staff list.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, deptFilter, circleFilter]);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await authApi.getAdminInvitations();
      setInvitationsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load invitations:', err);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchInvitations();
  }, [fetchStaff, fetchInvitations]);

  // Actions
  const handleApprove = async (staffId) => {
    setIsProcessing(true);
    try {
      await authApi.approveStaff(staffId);
      setStatusMessage('Staff account approved successfully.');
      setActionModal(null);
      fetchStaff();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve staff account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (staffId) => {
    setIsProcessing(true);
    try {
      await authApi.rejectStaff(staffId, actionReason);
      setStatusMessage('Staff application rejected.');
      setActionModal(null);
      setActionReason('');
      fetchStaff();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reject staff account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async (staffId) => {
    setIsProcessing(true);
    try {
      await authApi.suspendStaff(staffId, actionReason);
      setStatusMessage('Staff account suspended.');
      setActionModal(null);
      setActionReason('');
      fetchStaff();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to suspend staff account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (staffId) => {
    setIsProcessing(true);
    try {
      await authApi.reactivateStaff(staffId);
      setStatusMessage('Staff account reactivated.');
      setActionModal(null);
      fetchStaff();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reactivate staff account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsProcessing(true);
    try {
      const res = await authApi.createAdminInvitation({
        email: inviteEmail.trim(),
        designation: inviteDesignation,
        department: inviteDepartment
      });
      setGeneratedToken(res.invitation_token);
      setStatusMessage(`Admin invitation created for ${inviteEmail}.`);
      setInviteEmail('');
      fetchInvitations();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Filtered lists
  const pendingStaff = staffList.filter((s) => s.approval_status === 'PENDING_APPROVAL');
  const approvedStaff = staffList.filter((s) => s.approval_status === 'APPROVED');
  const suspendedStaff = staffList.filter((s) => s.approval_status === 'SUSPENDED');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>MSEDCL Staff & Administrator Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize field engineers, manage organizational postings, and invite system administrators.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStaff();
            fetchInvitations();
          }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 text-xs font-bold">✕</button>
        </div>
      )}

      {/* KPI Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveSubTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{pendingStaff.length}</p>
        </div>

        <div
          onClick={() => setActiveSubTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'approved'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Active Officers</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{approvedStaff.length}</p>
        </div>

        <div
          onClick={() => setActiveSubTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSubTab === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Staff
            </span>
            <Users className={`w-4 h-4 ${activeSubTab === 'all' ? 'text-slate-300' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black ${activeSubTab === 'all' ? 'text-white' : 'text-slate-900'}`}>{staffList.length}</p>
        </div>

        <div
          onClick={() => setActiveSubTab('invitations')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'invitations'
              ? 'bg-purple-500/10 border-purple-500 text-purple-900 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Admin Invitations</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900">{invitationsList.length}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Requests ({pendingStaff.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('approved')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Approved Officers ({approvedStaff.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Staff Records</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invitations')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'invitations'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Administrator Management</span>
        </button>
      </div>

      {/* Sub-tab 1: PENDING REQUESTS */}
      {activeSubTab === 'pending' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Staff Onboarding Requests</h2>
              <p className="text-xs text-slate-500">MSEDCL employees who have verified identity contact and require activation.</p>
            </div>
          </div>

          {pendingStaff.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">All Staff Requests Addressed</p>
              <p className="text-xs text-slate-500 mt-1">There are currently no staff onboarding requests awaiting review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Officer Details</th>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Posting / Division</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{staff.full_name}</div>
                        <div className="text-[11px] text-slate-500">{staff.official_email || staff.email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{staff.official_mobile || staff.phone_number}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {staff.employee_id}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{staff.designation}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {staff.department}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{staff.division || staff.circle || 'Not Specified'}</div>
                        <div className="text-[11px] text-slate-500">{staff.office_name || staff.section || staff.region}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Identity Verified: {staff.verification_status === 'VERIFIED' ? '✓' : 'Pending'}
                        </div>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setActionModal({ type: 'view', staff })}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'approve', staff })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'reject', staff })}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: APPROVED OFFICERS */}
      {activeSubTab === 'approved' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active MSEDCL Officers</h2>
              <p className="text-xs text-slate-500">Authorized technical field officers available for grievance assignment.</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name / EMP ID..."
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {approvedStaff.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No approved officers found matching criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Officer</th>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Jurisdiction</th>
                    <th className="p-3.5">Approved By</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {approvedStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{staff.full_name}</div>
                        <div className="text-[11px] text-slate-500">{staff.official_email || staff.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {staff.employee_id}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{staff.designation}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {staff.department}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{staff.division || staff.circle || 'MSEDCL HQ'}</div>
                        <div className="text-[11px] text-slate-500">{staff.subdivision || staff.office_name}</div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div>{staff.approved_by_name || 'System Admin'}</div>
                        <div className="text-[10px] text-slate-400">
                          {staff.approved_at ? new Date(staff.approved_at).toLocaleDateString() : 'Initial Setup'}
                        </div>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setActionModal({ type: 'view', staff })}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'suspend', staff })}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Suspend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: ALL STAFF RECORDS */}
      {activeSubTab === 'all' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">All MSEDCL Staff Onboarding Records</h2>
            <p className="text-xs text-slate-500">Audit trail of all registered officers across all approval states.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Officer</th>
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-500">{staff.official_email || staff.email}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold">{staff.employee_id}</td>
                    <td className="p-3.5">{staff.department}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.approval_status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : staff.approval_status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : staff.approval_status === 'SUSPENDED'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {staff.approval_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setActionModal({ type: 'view', staff })}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        View
                      </button>
                      {staff.approval_status === 'SUSPENDED' && (
                        <button
                          onClick={() => setActionModal({ type: 'reactivate', staff })}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 4: ADMINISTRATOR INVITATIONS */}
      {activeSubTab === 'invitations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Invitation Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 h-fit">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Shield className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900">Invite Administrator</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Create a cryptographically random, single-use invitation token for a new System Administrator.
            </p>

            {generatedToken && (
              <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span>Single-Use Invitation Token</span>
                  <span className="text-[10px] bg-purple-200 px-2 py-0.5 rounded">Valid 48h</span>
                </div>
                <div className="p-2.5 bg-white border border-purple-200 rounded-xl font-mono text-[11px] break-all select-all text-purple-950">
                  {generatedToken}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedToken)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Token Copied!' : 'Copy Invitation Token'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invitee Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. exec.admin@msedcl.in"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Designation
                </label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="e.g. Superintending Engineer (Admin)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Generate Admin Invitation</span>
              </button>
            </form>
          </div>

          {/* Invitations Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Admin Invitation Log</h2>
              <p className="text-xs text-slate-500">Recent administrator access invitations issued by authorized admins.</p>
            </div>

            {invitationsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No administrator invitations found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Invitee Email</th>
                      <th className="p-3.5">Designation</th>
                      <th className="p-3.5">Issued By</th>
                      <th className="p-3.5">Expires</th>
                      <th className="p-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invitationsList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{inv.email}</td>
                        <td className="p-3.5 text-slate-600">{inv.designation}</td>
                        <td className="p-3.5 text-slate-600">{inv.invited_by_name}</td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {new Date(inv.expires_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.is_accepted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.is_expired
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {inv.is_accepted ? 'Accepted' : inv.is_expired ? 'Expired' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation & Details Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 space-y-4">
            {actionModal.type === 'view' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">MSEDCL Officer Profile Details</h3>
                <p className="text-xs text-slate-500 mb-4">Complete organizational record and audit state</p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{actionModal.staff.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Employee ID</span>
                    <span className="font-mono font-bold text-slate-900">{actionModal.staff.employee_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Designation</span>
                    <span className="font-medium text-slate-800">{actionModal.staff.designation}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-800">{actionModal.staff.department}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Official Email</span>
                    <span className="text-slate-800">{actionModal.staff.official_email || actionModal.staff.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Official Mobile</span>
                    <span className="text-slate-800">{actionModal.staff.official_mobile || actionModal.staff.phone_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Region & Circle</span>
                    <span className="text-slate-800">{actionModal.staff.region} / {actionModal.staff.circle}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">Division & Sub-Division</span>
                    <span className="text-slate-800">{actionModal.staff.division} / {actionModal.staff.subdivision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Office / Section</span>
                    <span className="text-slate-800">{actionModal.staff.office_name || actionModal.staff.section}</span>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {actionModal.type === 'approve' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Officer Approval</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Are you sure you want to approve staff account for <span className="font-bold text-slate-800">{actionModal.staff.full_name}</span> ({actionModal.staff.employee_id})?
                </p>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 mb-4">
                  This action will activate their login and grant access to the Officer Workload and Grievance Assignment queue.
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActionModal(null)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleApprove(actionModal.staff.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {isProcessing ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            )}

            {actionModal.type === 'reject' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Staff Application</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Rejecting will decline activation for <span className="font-bold text-slate-800">{actionModal.staff.full_name}</span>.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason</label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter reason for audit record (e.g. Employee ID not verified in DISCOM directory)..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActionModal(null)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleReject(actionModal.staff.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {actionModal.type === 'suspend' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Suspend Staff Account</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Suspend portal access for <span className="font-bold text-slate-800">{actionModal.staff.full_name}</span> ({actionModal.staff.employee_id}).
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Suspension Reason</label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Reason for suspension..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActionModal(null)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleSuspend(actionModal.staff.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {isProcessing ? 'Suspending...' : 'Confirm Suspension'}
                  </button>
                </div>
              </div>
            )}

            {actionModal.type === 'reactivate' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Reactivate Staff Account</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Reactivate <span className="font-bold text-slate-800">{actionModal.staff.full_name}</span> ({actionModal.staff.employee_id}) to approved status.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActionModal(null)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleReactivate(actionModal.staff.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    {isProcessing ? 'Reactivating...' : 'Confirm Reactivate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffManagement;
