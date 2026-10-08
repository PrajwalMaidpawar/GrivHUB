import React from 'react';
import { Modal } from './Modal.jsx';
import { Printer, QrCode } from 'lucide-react';

export const OfficialReceiptModal = ({
  isOpen,
  onClose,
  grievance
}) => {
  if (!grievance) return null;

  const handlePrint = () => {
    window.print();
  };

  const slaDays = grievance.priority === 'CRITICAL' ? 1 : grievance.priority === 'HIGH' ? 3 : grievance.priority === 'MEDIUM' ? 7 : 14;
  const submissionDate = new Date(grievance.submittedAt);
  const expectedResolutionDate = new Date(submissionDate.getTime() + slaDays * 24 * 60 * 60 * 1000);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Grievance Acknowledgment Receipt"
      maxWidth="3xl"
    >
      <div className="space-y-5 text-xs text-slate-800" id="printable-receipt">
        {/* Actions bar for printing */}
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 print:hidden">
          <p className="text-slate-600 text-xs">
            Government & Municipal Corporation Official Digital Citizen Acknowledgment
          </p>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

        {/* The Official Certificate Container */}
        <div className="border-2 border-slate-800 p-6 sm:p-8 rounded-2xl bg-white space-y-6 shadow-xs relative overflow-hidden">
          {/* Watermark Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none select-none">
            <span className="text-8xl font-black tracking-widest text-slate-900 rotate-[-25deg]">
              GRIEVANCEHUB
            </span>
          </div>

          {/* Municipal Header */}
          <div className="text-center border-b-2 border-slate-800 pb-5 relative">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl border-2 border-amber-400 shadow-xs">
                🏛️
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-950">
              {grievance.location?.municipalCorporation || 'Municipal Corporation Administration'}
            </h2>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
              Public Grievance Redressal & Citizen Charter Service
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Receipt Reference: ACK-{grievance.grievanceNumber}-IN
            </p>
          </div>

          {/* Key Reference Grid & QR Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div className="sm:col-span-2 space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Unique Grievance Tracking ID
                </span>
                <span className="font-mono text-base font-black text-blue-800 tracking-wider">
                  {grievance.grievanceNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block font-medium">Registration Date:</span>
                  <span className="font-bold text-slate-800">
                    {submissionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">SLA Target Resolution:</span>
                  <span className="font-bold text-emerald-700">
                    {expectedResolutionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Simulation Box */}
            <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 text-center">
              <div className="w-16 h-16 bg-slate-900 rounded p-1 flex items-center justify-center text-white">
                <QrCode className="w-12 h-12 text-white" />
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">Scan to Verify Ticket</span>
            </div>
          </div>

          {/* Complainant & Incident Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              1. Complainant & Issue Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500">Citizen Name:</span>
                <p className="font-bold text-slate-900">{grievance.citizenName}</p>
              </div>
              <div>
                <span className="text-slate-500">Registered Contact:</span>
                <p className="font-bold text-slate-900">{grievance.citizenMobile || '+91 9881098765'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Complaint Title:</span>
                <p className="font-bold text-slate-900">{grievance.title}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Complaint Statement:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-line">
                  {grievance.description}
                </p>
              </div>
            </div>
          </div>

          {/* Department & Routing Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              2. Municipal Department Routing & Jurisdiction
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500">Assigned Department:</span>
                <p className="font-bold text-blue-900">{grievance.departmentName}</p>
              </div>
              <div>
                <span className="text-slate-500">Civic Category:</span>
                <p className="font-bold text-slate-900">{grievance.finalCategoryName}</p>
              </div>
              <div>
                <span className="text-slate-500">Assigned Field Officer:</span>
                <p className="font-bold text-slate-900">{grievance.assignedOfficerName || 'Under Immediate Assignment'}</p>
              </div>
              <div>
                <span className="text-slate-500">Ward & Zone:</span>
                <p className="font-bold text-slate-900">{grievance.location?.ward} ({grievance.location?.zone})</p>
              </div>
              <div>
                <span className="text-slate-500">Locality & Landmark:</span>
                <p className="font-bold text-slate-900">{grievance.location?.locality}, {grievance.location?.landmark}</p>
              </div>
              <div>
                <span className="text-slate-500">PIN Code & City:</span>
                <p className="font-bold text-slate-900">{grievance.location?.pinCode}, {grievance.location?.city}</p>
              </div>
            </div>
          </div>

          {/* Digital Signature & Footer Seal */}
          <div className="pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-600 flex items-center justify-center text-emerald-700 font-bold text-lg">
                ✓
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Digitally Verified & Logged
                </span>
                <span className="text-[10px] text-slate-500">
                  Secured via GrievanceHUB Automated Public Portal
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-serif italic font-bold text-slate-900 text-sm">
                Commissioner Office (Civic Affairs)
              </div>
              <span className="text-[10px] text-slate-500 block">
                Municipal Corporation Administration
              </span>
            </div>
          </div>
        </div>

        {/* Modal Close */}
        <div className="flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print Acknowledgment
          </button>
        </div>
      </div>
    </Modal>
  );
};
