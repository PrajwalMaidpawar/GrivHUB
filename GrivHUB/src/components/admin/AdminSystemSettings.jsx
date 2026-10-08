import React, { useState, useEffect } from 'react';
import grievanceApi from '../../api/grievanceApi.js';
import {
  Settings,
  Save,
  CheckCircle2,
  RefreshCw,
  Zap,
  Sliders,
  Shield,
  Clock,
  HardDrive,
  Globe,
  Lock
} from 'lucide-react';

export const AdminSystemSettings = () => {
  const [settings, setSettings] = useState({
    default_max_officer_workload: 10,
    auto_closure_hours: 168,
    min_ml_confidence_threshold: 0.70,
    max_attachment_size_mb: 10,
    strict_jurisdiction_routing: true,
    auto_closure_enabled: true,
    citizen_reopen_window_days: 7
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await grievanceApi.getAdminSettings();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await grievanceApi.updateAdminSettings(settings);
      setSettings((prev) => ({ ...prev, ...updated }));
      showToast('System configuration parameters saved and logged to audit trail.');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutoClosure = async () => {
    try {
      setAutoClosing(true);
      const res = await grievanceApi.triggerAutoClosure();
      showToast(`Auto-closure job complete: ${res.closed_count} eligible resolved grievances closed.`);
    } catch (err) {
      console.error('Auto-closure run error:', err);
      showToast('Auto-closure policy execution failed.');
    } finally {
      setAutoClosing(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-system-settings-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal System Settings & Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated workload caps, ML confidence floors, auto-closure windows, and global security policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRunAutoClosure}
            disabled={autoClosing}
            className="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-2 transition shrink-0"
          >
            <Zap className={`w-3.5 h-3.5 ${autoClosing ? 'animate-bounce' : ''}`} />
            <span>{autoClosing ? 'Evaluating...' : 'Run Auto-Closure Job'}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* ML & Classification Policies */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Machine Learning & Active Learning Policies</h2>
              <p className="text-xs text-slate-500">Confidence cutoffs and human-in-the-loop review thresholds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum ML Confidence Floor for Auto-Dispatch ({Math.round(settings.min_ml_confidence_threshold * 100)}%)
              </label>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={settings.min_ml_confidence_threshold}
                onChange={(e) => setSettings({ ...settings, min_ml_confidence_threshold: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Predictions below this score will trigger operational alerts for administrative classification review before final officer dispatch.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Strict Jurisdiction Routing Enforcement
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  id="strictRouting"
                  checked={settings.strict_jurisdiction_routing}
                  onChange={(e) => setSettings({ ...settings, strict_jurisdiction_routing: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="strictRouting" className="text-xs text-slate-700">
                  Require designated ward match when selecting lowest-workload officer.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Workload & Capacity Policies */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Workload & Officer Saturation Safeguards</h2>
              <p className="text-xs text-slate-500">Limits on active tasks assigned per municipal field engineer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Maximum Workload Per Officer
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.default_max_officer_workload}
                onChange={(e) => setSettings({ ...settings, default_max_officer_workload: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Field engineers at or exceeding this capacity will be temporarily bypassed by the intelligent auto-routing algorithm.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Attachment Size Limit (MB)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.max_attachment_size_mb}
                onChange={(e) => setSettings({ ...settings, max_attachment_size_mb: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum file upload size allowed per citizen evidence photo or video.
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Closure & Resolution SLA Policies */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Auto-Closure & Grievance Lifecycle Directives</h2>
              <p className="text-xs text-slate-500">Citizen feedback windows and automated municipal closure execution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Citizen Reopen / Objection Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.citizen_reopen_window_days}
                onChange={(e) => setSettings({ ...settings, citizen_reopen_window_days: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Number of days a citizen has to inspect officer resolution evidence and request a reopening before permanent closure.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Auto-Closure Lifecycle Trigger
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  id="autoCloseEnabled"
                  checked={settings.auto_closure_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_closure_enabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="autoCloseEnabled" className="text-xs text-slate-700">
                  Automatically mark RESOLVED complaints as CLOSED once the reopen window expires.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving System Policies...' : 'Save Configuration Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSystemSettings;
