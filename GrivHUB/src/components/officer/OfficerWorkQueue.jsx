import React, { useState, useMemo } from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/i18nContext.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { PriorityBadge } from '../common/PriorityBadge.jsx';
import { SLABadge } from '../common/SLABadge.jsx';
import {
  Search,
  Filter,
  Eye,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Clock
} from 'lucide-react';

export const OfficerWorkQueue = ({ onViewGrievance }) => {
  const { grievances, categories } = useGrievance();
  const { currentUser } = useAuth();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Filter officer's assigned grievances
  const myGrievances = useMemo(() => {
    return grievances.filter(
      (g) => g.assignedOfficerId === currentUser.id || (!g.assignedOfficerId && g.departmentId === currentUser.departmentId)
    );
  }, [grievances, currentUser]);

  const filteredAndSorted = useMemo(() => {
    let result = myGrievances.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (g.grievanceNumber || '').toLowerCase().includes(q) ||
        (g.title || '').toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q) ||
        (g.location?.ward || '').toLowerCase().includes(q) ||
        (g.location?.locality || '').toLowerCase().includes(q) ||
        (g.citizenName || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? g.status === 'ASSIGNED' || g.status === 'IN_PROGRESS' || g.status === 'REOPENED'
          : g.status === statusFilter;

      const matchesPriority = priorityFilter === 'ALL' || g.priority === priorityFilter;

      const matchesCategory =
        categoryFilter === 'ALL' ||
        g.finalCategoryId === categoryFilter ||
        g.selectedCategoryId === categoryFilter ||
        (g.finalCategoryName || '').toLowerCase().includes(categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      }
      if (sortBy === 'PRIORITY') {
        const pMap = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (pMap[a.priority] ?? 2) - (pMap[b.priority] ?? 2);
      }
      return 0;
    });

    return result;
  }, [myGrievances, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('NEWEST');
  };

  const statusCounts = {
    all: myGrievances.length,
    active: myGrievances.filter((g) => g.status === 'ASSIGNED' || g.status === 'IN_PROGRESS' || g.status === 'REOPENED').length,
    assigned: myGrievances.filter((g) => g.status === 'ASSIGNED').length,
    inProgress: myGrievances.filter((g) => g.status === 'IN_PROGRESS').length,
    resolved: myGrievances.filter((g) => g.status === 'RESOLVED' || g.status === 'CLOSED').length,
    reopened: myGrievances.filter((g) => g.status === 'REOPENED').length
  };

  return (
    <div className="space-y-6" id="officer-work-queue-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('navWorkQueue') || 'Assigned Grievances Queue'}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time management of MSEDCL electricity complaints assigned to your field jurisdiction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
            {filteredAndSorted.length} of {myGrievances.length} Complaints
          </span>
        </div>
      </div>

      {/* Quick Status Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Tasks', count: statusCounts.all },
          { id: 'ACTIVE', label: 'Active Workload', count: statusCounts.active },
          { id: 'ASSIGNED', label: 'Assigned', count: statusCounts.assigned },
          { id: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.inProgress },
          { id: 'REOPENED', label: 'Reopened', count: statusCounts.reopened },
          { id: 'RESOLVED', label: 'Resolved / Closed', count: statusCounts.resolved }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Comprehensive Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, consumer number, or locality..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical SLA</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 truncate"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="PRIORITY">Priority (High-Low)</option>
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing {filteredAndSorted.length} matching complaints
            </span>
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-semibold text-slate-800 text-sm">No grievances match your search criteria.</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Try adjusting your search terms or clearing your status and priority filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Grievance Info</th>
                  <th className="px-4 py-3.5">Consumer Details</th>
                  <th className="px-4 py-3.5">Location / Service Area</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">MSEDCL SLA Status</th>
                  <th className="px-4 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => onViewGrievance(g.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {g.grievanceNumber}
                        </span>
                        {g.priority === 'CRITICAL' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            CRITICAL
                          </span>
                        )}
                        {g.status === 'REOPENED' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            REOPENED
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 text-xs mt-0.5 max-w-sm line-clamp-1">
                        {g.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Category: {g.finalCategoryName}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div className="font-medium">{g.citizenName || 'Consumer'}</div>
                      <div className="text-[10px] text-slate-400">{g.citizenMobile}</div>
                      {g.consumerNumber && (
                        <div className="text-[10px] font-mono text-blue-600 mt-0.5">
                          CA: {g.consumerNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="font-medium text-slate-800">{g.location?.serviceArea || g.location?.ward || 'Pune Urban Sub-Division'}</div>
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
                    <td className="px-4 py-4">
                      <div className="max-w-[190px]">
                        <SLABadge sla={g.sla} status={g.status} priority={g.priority} showProgress={true} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-[11px]">
                      {new Date(g.submittedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewGrievance(g.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
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
