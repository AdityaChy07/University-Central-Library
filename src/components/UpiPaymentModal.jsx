import React, { useState, useEffect } from 'react';
import { CheckCircle2, Smartphone, Clock, QrCode, Printer, Copy, Check, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { payFineApi } from '../services/api';

/**
 * Shared Real-Time UPI QR Payment & Clearance Receipt Modal
 * Supports both Student and Teacher fine submissions + Librarian verification workflow.
 */
const UpiPaymentModal = ({ record, user, onClose, onSuccess, showToast }) => {
  const [upiUtr, setUpiUtr] = useState('');
  const [upiMethod, setUpiMethod] = useState('UPI QR Scanner (GPay / PhonePe / Paytm)');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    setUpiUtr('');
    setSubmittedRecord(null);
    setCopiedUpi(false);
  }, [record?._id]);

  if (!record) return null;

  const libraryUpiId = import.meta.env.VITE_LIBRARY_UPI_ID || 'central.library@upi';
  const libraryPayeeName = import.meta.env.VITE_LIBRARY_PAYEE_NAME || 'Central University Library';

  const activeRecord = submittedRecord || record;
  const fineToPay = activeRecord.currentEstimatedFine || activeRecord.fineAmount || 0;
  const paymentStatus =
    activeRecord.paymentStatus || (activeRecord.finePaid ? 'PAID' : 'UNPAID');

  const upiUri = `upi://pay?pa=${libraryUpiId}&pn=${encodeURIComponent(
    libraryPayeeName
  )}&am=${fineToPay}&tn=LibFine_${activeRecord._id?.slice(-6)}&cu=INR`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiUri
  )}&margin=4`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(libraryUpiId);
    setCopiedUpi(true);
    showToast?.('UPI ID copied to clipboard!', 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFillTestUtr = () => {
    const randomUtr = `4328${Math.floor(10000000 + Math.random() * 90000000)}`;
    setUpiUtr(randomUtr);
    showToast?.('Sample 12-digit UPI UTR generated for test!', 'info');
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!upiUtr.trim()) {
      showToast?.('Please enter your 12-digit UPI UTR / Transaction Reference number.', 'error');
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await payFineApi(activeRecord._id, {
        paymentMethod: upiMethod,
        paymentUtr: upiUtr.trim(),
      });
      setSubmittedRecord(res.data.data);
      showToast?.(
        res.data.message || 'Payment proof submitted! Awaiting Librarian confirmation.',
        'success'
      );
      onSuccess?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(record)}
      onClose={onClose}
      title="UPI Real-Time Scanner & Fine Clearance"
      maxWidth="max-w-md"
    >
      {paymentStatus === 'PAID' || activeRecord.finePaid ? (
        /* VERIFIED DIGITAL CLEARANCE RECEIPT */
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1.5 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-sm">Official Institutional Fine Clearance Receipt</h4>
            <p className="text-xs text-emerald-700">Verified and marked Paid by the Library Administration.</p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Receipt Ref:</span>
              <strong className="text-sky-800">{activeRecord.paymentId || 'UCL-REC-VERIFIED'}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">UPI Reference (UTR):</span>
              <strong className="text-slate-900">{activeRecord.paymentUtr || 'Desk Verified'}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Member:</span>
              <span className="text-slate-800">{user?.memberId} ({user?.name})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Book Title:</span>
              <span className="truncate max-w-44 font-sans font-semibold text-slate-800">{activeRecord.bookId?.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Amount Paid:</span>
              <strong className="text-emerald-700 font-bold text-xs">₹{fineToPay}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Clearance Date:</span>
              <span className="text-slate-800">{new Date(activeRecord.paidDate || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Circulation Status:</span>
              <span className="text-emerald-700 font-bold">PAID &amp; VERIFIED</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-press flex-1 py-2.5 bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      ) : paymentStatus === 'PENDING_VERIFICATION' ? (
        /* SUBMITTED - AWAITING LIBRARIAN UPDATE */
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center space-y-1.5 shadow-xs">
            <Clock className="w-8 h-8 text-amber-600 mx-auto animate-pulse" />
            <h4 className="font-bold text-sm">Payment Proof Submitted</h4>
            <p className="text-xs text-amber-800">
              Your UPI transaction reference has been recorded. Once the Chief Librarian verifies the receipt in the ledger, your loan status will automatically switch to <strong>PAID</strong>.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Submitted UTR:</span>
              <strong className="text-indigo-700">{activeRecord.paymentUtr}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Payment Channel:</span>
              <span>{activeRecord.paymentMethod || 'UPI QR Scanner'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500">Amount:</span>
              <strong className="text-slate-900 text-xs">₹{fineToPay}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Timestamp:</span>
              <span>
                {new Date(activeRecord.paymentSubmittedAt || Date.now()).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-press w-full py-2.5 bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
          >
            Back to Portal
          </button>
        </div>
      ) : (
        /* SCAN UPI QR & SUBMIT UTR FORM */
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Payee Institutional ID:</span>
              <strong className="text-slate-900">{libraryPayeeName}</strong>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono text-[#0F2942] font-semibold">{libraryUpiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  title="Copy UPI ID"
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[11px] block">Total Fine Due:</span>
              <span className="text-xl font-extrabold text-red-600 tabular-nums">₹{fineToPay}</span>
            </div>
          </div>

          <div className="bg-white border-2 border-dashed border-[#0F2942]/20 rounded-2xl p-4 text-center space-y-2.5">
            <div className="inline-block p-2 bg-white rounded-xl shadow-md border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-[#0F2942]" />
              <span>Scan with Real-Time Banking Scanner</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600 font-medium">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">GPay</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">PhonePe</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">Paytm</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">BHIM UPI</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={upiMethod}
              onChange={(e) => setUpiMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F2942] bg-white shadow-2xs"
            >
              <option value="UPI QR Scanner (GPay / PhonePe / Paytm)">
                UPI QR Scanner (GPay / PhonePe / Paytm)
              </option>
              <option value="BHIM / Bank UPI App">BHIM / Bank UPI App</option>
              <option value="Library Circulation Desk Cash">Library Circulation Desk Cash</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                12-Digit UPI Ref / UTR Number *
              </label>
              <button
                type="button"
                onClick={handleFillTestUtr}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Fill Sample UTR</span>
              </button>
            </div>
            <input
              type="text"
              required
              maxLength="24"
              placeholder="e.g. 432819283912 (from transaction confirmation)"
              value={upiUtr}
              onChange={(e) => setUpiUtr(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F2942] shadow-2xs"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              After submitting, the Chief Librarian will verify the transaction reference in the administrative ledger.
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-press px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayment || !upiUtr.trim()}
              className="btn-press px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#0F2942] to-[#1E3A5F] hover:from-[#17395B] hover:to-[#254A78] text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{processingPayment ? 'Submitting...' : `Submit ₹${fineToPay} Clearance`}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UpiPaymentModal;
