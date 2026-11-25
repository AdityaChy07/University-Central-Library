import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Clock } from 'lucide-react';
import { getBorrowHistory, verifyFinePaymentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BorrowHistory = ({ showToast }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const isLibrarian = user?.role === 'LIBRARIAN';

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getBorrowHistory({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        memberId: !isLibrarian ? user?._id : undefined,
        search: searchTerm,
      });
      setHistory(res.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, searchTerm, user]);

  const handleMarkPaid = async (recordId) => {
    setUpdatingId(recordId);
    try {
      const res = await verifyFinePaymentApi(recordId, { action: 'APPROVE' });
      showToast?.(res.data.message || 'Fine marked as Paid!', 'success');
      fetchHistory();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {isLibrarian ? 'Borrow & Loan Audit History' : 'My Borrow & Payment Ledger'}
        </h2>
        <p className="text-xs text-slate-500">
          {isLibrarian
            ? 'Permanent ledger of all academic borrowing transactions, due dates, and fine payment verifications.'
            : 'Complete record of your borrowed textbooks, return dates, and fine clearance receipts.'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by member name, member ID, or book title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium w-full sm:w-auto">
          {['ALL', 'ISSUED', 'RETURNED', 'OVERDUE'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex-1 sm:flex-none ${
                statusFilter === s
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading loan records...</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No borrow records found matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Book Details</th>
                  <th className="px-6 py-3">Member Details</th>
                  <th className="px-6 py-3">Dates (Issue / Due)</th>
                  <th className="px-6 py-3 text-center">Loan Status</th>
                  <th className="px-6 py-3 text-right">Fine & Fee Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((record) => {
                  const isOverdue =
                    record.isCurrentlyOverdue ||
                    (record.status === 'ISSUED' && new Date(record.dueDate) < new Date());
                  const fineAmt = record.currentEstimatedFine || record.fineAmount || 0;
                  const pStatus = record.paymentStatus || (record.finePaid ? 'PAID' : 'UNPAID');

                  return (
                    <tr key={record._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {record.bookId?.title || 'Unknown Book'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          ISBN: {record.bookId?.isbn || 'N/A'} • {record.bookId?.category}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {record.memberId?.name || 'Unknown Member'}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: <span className="font-mono">{record.memberId?.memberId}</span> • {record.memberId?.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 space-y-0.5">
                        <div>
                          Issued: <strong>{new Date(record.issueDate).toLocaleDateString()}</strong>
                        </div>
                        <div>
                          Due:{' '}
                          <strong className={isOverdue ? 'text-red-600' : 'text-slate-800'}>
                            {new Date(record.dueDate).toLocaleDateString()}
                          </strong>
                        </div>
                        {record.returnDate && (
                          <div className="text-emerald-700">
                            Returned: <strong>{new Date(record.returnDate).toLocaleDateString()}</strong>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            record.status === 'ISSUED'
                              ? isOverdue
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {record.status === 'ISSUED' && isOverdue ? 'OVERDUE' : record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-y-1">
                        {fineAmt > 0 ? (
                          <>
                            <div className="font-bold text-slate-900">
                              ₹{fineAmt}{' '}
                              <span className="text-[11px] font-normal text-slate-500">
                                ({record.currentOverdueDays || record.overdueDays}d late)
                              </span>
                            </div>

                            {pStatus === 'PAID' || record.finePaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Paid ({record.paymentId})
                              </span>
                            ) : pStatus === 'PENDING_VERIFICATION' ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3" /> Pending Approval (UTR: {record.paymentUtr})
                                </span>
                                {isLibrarian && (
                                  <button
                                    onClick={() => handleMarkPaid(record._id)}
                                    disabled={updatingId === record._id}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Verify & Mark Paid
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] font-semibold text-red-600">Unpaid</span>
                                {isLibrarian && (
                                  <button
                                    onClick={() => handleMarkPaid(record._id)}
                                    disabled={updatingId === record._id}
                                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">No fine (₹0)</span>
                        )}
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

export default BorrowHistory;
