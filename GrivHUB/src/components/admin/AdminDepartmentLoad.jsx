import React from 'react';
import { useGrievance } from '../../context/GrievanceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Users } from 'lucide-react';

export const AdminDepartmentLoad = () => {
  const { departments, grievances } = useGrievance();
  const { allUsers } = useAuth();

  const officers = allUsers.filter((u) => u.role === 'OFFICER');

  return (
    <div className="space-y-6" id="admin-department-load-view">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Departmental Workload & Staffing</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time capacity tracking and smart load-balancing parameters across municipal divisions
        </p>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const deptGrievances = grievances.filter((g) => g.departmentId === dept.id);
          const activeGrievances = deptGrievances.filter(
            (g) => g.status !== 'RESOLVED' && g.status !== 'CLOSED'
          );
          const resolvedGrievances = deptGrievances.filter(
            (g) => g.status === 'RESOLVED' || g.status === 'CLOSED'
          );
          const deptOfficers = officers.filter((o) => o.departmentId === dept.id);

          const totalCapacity = deptOfficers.reduce((acc, o) => acc + (o.maxWorkload || 15), 0) || 30;
          const loadPercentage = Math.min(100, Math.round((activeGrievances.length / totalCapacity) * 100));

          return (
            <div
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {dept.code}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{dept.name}</h2>
                      <p className="text-[10px] text-slate-400">{dept.contactEmail}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      loadPercentage > 80
                        ? 'bg-rose-100 text-rose-800'
                        : loadPercentage > 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {loadPercentage}% Load
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3">{dept.description}</p>

                {/* Capacity Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Active Load</span>
                    <span>
                      {activeGrievances.length} / {totalCapacity} Capacity
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercentage > 80
                          ? 'bg-rose-500'
                          : loadPercentage > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${loadPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="text-sm font-bold text-slate-800">{deptGrievances.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Active</span>
                    <span className="text-sm font-bold text-blue-700">{activeGrievances.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Resolved</span>
                    <span className="text-sm font-bold text-emerald-700">{resolvedGrievances.length}</span>
                  </div>
                </div>
              </div>

              {/* Staffed Officers list */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Field Officers ({deptOfficers.length})</span>
                </div>
                {deptOfficers.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No assigned officers</p>
                ) : (
                  <div className="space-y-1.5">
                    {deptOfficers.map((off) => (
                      <div
                        key={off.id}
                        className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg"
                      >
                        <span className="font-medium text-slate-800">{off.fullName}</span>
                        <span className="text-slate-500">{off.designation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
