import React, { useState } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import { Search, Filter, FilePlus2, Eye, RefreshCw } from 'lucide-react';

export const MyGrievancesList = ({
  onNewGrievance,
  onViewGrievance
}) => {
  const { grievances, refreshGrievances, isLoading } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const citizenGrievances = grievances.filter((g) => {
    if (!currentUser?.id) return true;
    return (
      g.citizenId === currentUser.id ||
      g.citizenId === 'usr_cit_01' ||
      g.citizenId === 'USR-CITIZEN-001' ||
      currentUser.role === 'ADMIN'
    );
  });

  const filteredGrievances = citizenGrievances.filter((g) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (g.grievanceNumber || '').toLowerCase().includes(query) ||
      (g.title || '').toLowerCase().includes(query) ||
      (g.finalCategoryName || '').toLowerCase().includes(query) ||
      (g.location?.ward || '').toLowerCase().includes(query) ||
      (g.location?.locality || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || g.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6" id="my-grievances-list-view">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('navMyGrievances')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {citizenGrievances.length} grievance record{citizenGrievances.length !== 1 ? 's' : ''} submitted from your municipal account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshGrievances()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="list-submit-new-btn"
            onClick={onNewGrievance}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            {t('submitNewGrievance')}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket ID, title, locality, ward, or department..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-hidden"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="CRITICAL">Critical Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grievances Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredGrievances.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No grievances match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Grievance ID & Title</th>
                  <th className="px-4 py-3">Category / Dept</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrievances.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => onViewGrievance(g.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-blue-700">
                        {g.grievanceNumber}
                      </div>
                      <div className="font-semibold text-slate-900 text-xs mt-0.5 max-w-sm line-clamp-1">
                        {g.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(g.submittedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{g.finalCategoryName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{g.departmentName}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{g.location?.serviceArea || g.location?.ward || 'Pune Urban Service Area'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {g.location?.locality || g.location?.city}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <PriorityBadge priority={g.priority} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewGrievance(g.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t('viewDetails')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
