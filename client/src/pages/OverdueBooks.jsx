import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Send,
  ArrowLeftRight,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
} from 'lucide-react';
import {
  getOverdueLoans,
  sendOverdueReminder,
  triggerCronScan,
  returnBook,
  verifyFinePaymentApi,
} from '../services/api';

const OverdueBooks = ({ showToast, onRefreshData }) => {
  const [overdueList, setOverdueList] = useState([]);
  const [paymentQueue, setPaymentQueue] = useState([]);
  const [totalFine, setTotalFine] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [cronRunning, setCronRunning] = useState(false);

  const fetchOverdue = async () => {
    try {
      setLoading(true);
      const res = await getOverdueLoans();
      setOverdueList(res.data?.data || []);
      setPaymentQueue(res.data?.paymentQueue || []);
      setTotalFine(res.data?.totalEstimatedFine || 0);
      setPendingCount(res.data?.pendingCount || 0);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const handleSendReminder = async (recordId) => {
    setSendingId(recordId);
    try {
      const res = await sendOverdueReminder(recordId);
      showToast?.(res.data.message || 'Overdue reminder email sent successfully!', 'success');
      fetchOverdue();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setSendingId(null);
    }
  };

  const handleRunScheduler = async () => {
    setCronRunning(true);
    try {
      const res = await triggerCronScan();
      showToast?.(
        `Overdue Cron Completed: ${res.data.sent} sent, ${res.data.skipped} already sent today.`,
        'success'
      );
      fetchOverdue();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setCronRunning(false);
    }
  };

  const handleQuickReturn = async (recordId) => {
    try {
      const res = await returnBook(recordId);
      showToast?.(res.data.message || 'Book returned successfully!', 'success');
      fetchOverdue();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleVerifyPayment = async (recordId, action = 'APPROVE') => {
    setVerifyingId(recordId);
    try {
      const res = await verifyFinePaymentApi(recordId, { action });
      showToast?.(res.data.message || 'Payment status updated!', 'success');
      fetchOverdue();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const renderPaymentCell = (loan) => {
    const pStatus = loan.paymentStatus || (loan.finePaid ? 'PAID' : 'UNPAID');

    if (pStatus === 'PAID' || loan.finePaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paid ({loan.paymentId || 'Cleared'})
        </span>
      );
    }

    if (pStatus === 'PENDING_VERIFICATION') {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3" /> Pending Librarian Approval
          </span>
          <div className="text-[11px] font-mono text-indigo-700 font-semibold">
            UTR: {loan.paymentUtr}
          </div>
          <div className="text-[10px] text-slate-500">{loan.paymentMethod}</div>
        </div>
      );
    }

    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        Unpaid
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Overdue Books & Fee Payment Verification</span>
          </h2>
          <p className="text-xs text-slate-500">
            Verify Student/Teacher UPI QR payments, mark counter dues as Paid, and dispatch overdue reminders.
          </p>
        </div>

        <button
          onClick={handleRunScheduler}
          disabled={cronRunning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Send className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
          <span>{cronRunning ? 'Dispatching Reminders...' : 'Trigger Daily Overdue Email Job'}</span>
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-red-700 rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <span className="text-[11px] font-semibold uppercase text-red-800 tracking-wider">
            Outstanding Unpaid Dues
          </span>
          <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">₹{totalFine}</div>
          <p className="text-xs text-slate-600 mt-1">
            {overdueList.length} overdue loan(s) • <strong className="text-amber-800">{pendingCount}</strong> payment(s) awaiting Librarian verification.
          </p>
        </div>
        <div className="text-xs text-slate-600 max-w-sm bg-slate-50 border border-slate-200 p-3 rounded">
          <strong>Settlement Policy:</strong> Verify Student or Faculty UPI UTR references below to finalize fee clearance receipts.
        </div>
      </div>

      {/* Pending Payment Verifications & Unpaid Dues Queue */}
      {paymentQueue.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>Fee Verification & Counter Payment Desk ({paymentQueue.length})</span>
              </h3>
              <p className="text-xs text-slate-600">
                Verify UPI UTR submissions or mark desk cash/UPI collections as Paid.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Book & Loan Status</th>
                  <th className="px-6 py-3 text-center">Fine Amount</th>
                  <th className="px-6 py-3">Payment Proof / Status</th>
                  <th className="px-6 py-3 text-right">Librarian Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentQueue.map((item) => {
                  const isPending = item.paymentStatus === 'PENDING_VERIFICATION';
                  return (
                    <tr key={item._id} className={isPending ? 'bg-amber-50/40' : ''}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.memberId?.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.memberId?.memberId} ({item.memberId?.role})
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.bookId?.title}</div>
                        <div className="text-xs text-slate-500">Loan: {item.status}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-extrabold text-red-600">
                        ₹{item.estimatedFine}
                      </td>
                      <td className="px-6 py-4">{renderPaymentCell(item)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerifyPayment(item._id, 'APPROVE')}
                            disabled={verifyingId === item._id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isPending ? 'Verify & Mark Paid' : 'Mark Paid'}
                            </span>
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleVerifyPayment(item._id, 'REJECT')}
                              disabled={verifyingId === item._id}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Reject invalid UTR"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading overdue loans...</div>
        ) : overdueList.length === 0 ? (
          <div className="py-12 text-center text-emerald-600 text-sm flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8" />
            <p className="font-semibold">All issued books are currently on time! No overdue loans.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Overdue Book</th>
                  <th className="px-6 py-3">Member Details</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-center">Overdue & Fine</th>
                  <th className="px-6 py-3">Payment Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.map((loan) => {
                  const pStatus = loan.paymentStatus || (loan.finePaid ? 'PAID' : 'UNPAID');
                  return (
                    <tr key={loan._id} className="hover:bg-red-50/20 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{loan.bookId?.title}</div>
                        <div className="text-xs font-mono text-slate-500">ISBN: {loan.bookId?.isbn}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{loan.memberId?.name}</div>
                        <div className="text-xs text-slate-500">
                          {loan.memberId?.memberId} ({loan.memberId?.role}) • {loan.memberId?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-red-600">
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-extrabold text-red-600 text-base">₹{loan.estimatedFine}</div>
                        <span className="text-[11px] font-semibold text-red-700">
                          {loan.overdueDays} day(s) late
                        </span>
                      </td>
                      <td className="px-6 py-4">{renderPaymentCell(loan)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {!loan.finePaid && pStatus !== 'PAID' && (
                            <button
                              onClick={() => handleVerifyPayment(loan._id, 'APPROVE')}
                              disabled={verifyingId === loan._id}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Confirm fee payment received"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{pStatus === 'PENDING_VERIFICATION' ? 'Verify Paid' : 'Mark Paid'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendReminder(loan._id)}
                            disabled={sendingId === loan._id}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                            title="Send Email Overdue Notice"
                          >
                            <Send className={`w-3.5 h-3.5 ${sendingId === loan._id ? 'animate-spin' : ''}`} />
                            <span>{sendingId === loan._id ? 'Sending...' : 'Remind'}</span>
                          </button>
                          <button
                            onClick={() => handleQuickReturn(loan._id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
                            title="Quick Return Book"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverdueBooks;
