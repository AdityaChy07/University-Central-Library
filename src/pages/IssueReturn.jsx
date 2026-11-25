import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Mail,
  Send,
  HelpCircle,
} from 'lucide-react';
import { getBooks, getMembers, issueBook, returnBook, getBorrowHistory } from '../services/api';

const IssueReturn = ({ showToast, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState('issue'); // 'issue' | 'return'

  // Data
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Issue Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [issueReceipt, setIssueReceipt] = useState(null);

  // Return Form State
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [customReturnDate, setCustomReturnDate] = useState(''); // for test / viva demonstration
  const [returnReceipt, setReturnReceipt] = useState(null);

  const fetchDropdowns = async () => {
    try {
      setLoading(true);
      const [membersRes, booksRes, loansRes] = await Promise.all([
        getMembers(),
        getBooks(),
        getBorrowHistory({ status: 'ISSUED' }),
      ]);
      setMembers(membersRes.data?.data || []);
      setBooks(booksRes.data?.data || []);
      setActiveLoans(loansRes.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Dynamic Issue calculation: 45 days for Teacher, 7 days for Student
  const selectedMember = members.find((m) => m._id === selectedMemberId);
  const selectedBook = books.find((b) => b._id === selectedBookId);
  const loanDays = selectedMember?.role === 'TEACHER' ? 45 : 7;

  const today = new Date();
  const calculatedDueDate = new Date();
  calculatedDueDate.setDate(today.getDate() + loanDays);

  // Selected Loan for Return preview
  const selectedLoan = activeLoans.find((l) => l._id === selectedLoanId);

  // Calculate live return fine preview
  const evaluateReturnFine = () => {
    if (!selectedLoan) return { overdueDays: 0, fine: 0, isLate: false };
    const returnDt = customReturnDate ? new Date(customReturnDate) : new Date();
    const dueDt = new Date(selectedLoan.dueDate);

    // Normalize to calendar day midnights
    const d1 = new Date(dueDt.getFullYear(), dueDt.getMonth(), dueDt.getDate());
    const d2 = new Date(returnDt.getFullYear(), returnDt.getMonth(), returnDt.getDate());
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    const overdueDays = Math.max(0, diffDays);
    const fine = overdueDays * 5;

    return {
      overdueDays,
      fine,
      isLate: overdueDays > 0,
      returnDateStr: returnDt.toLocaleDateString(),
    };
  };

  const returnEvaluation = evaluateReturnFine();

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedBookId) {
      showToast?.('Please select both a member and a book.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await issueBook({
        memberId: selectedMemberId,
        bookId: selectedBookId,
      });
      setIssueReceipt(res.data.data);
      showToast?.(res.data.message || 'Book issued successfully!', 'success');
      setSelectedMemberId('');
      setSelectedBookId('');
      fetchDropdowns();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLoanId) {
      showToast?.('Please select an active loan to return.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const payload = customReturnDate ? { returnDate: customReturnDate } : {};
      const res = await returnBook(selectedLoanId, payload);
      setReturnReceipt({
        ...res.data.data,
        overdueDays: res.data.overdueDays,
        fineAmount: res.data.fineAmount,
        message: res.data.message,
      });
      showToast?.(res.data.message || 'Book returned successfully!', 'success');
      setSelectedLoanId('');
      setCustomReturnDate('');
      fetchDropdowns();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Circulation & Issue Desk</h2>
        <p className="text-xs text-slate-500">
          Issue academic books, enforce the 7-day loan window, and process returns with ₹5/day overdue fines.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('issue')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'issue'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Issue Book ({selectedMember ? `${loanDays}-Day Loan` : '7 / 45-Day Policy'})</span>
        </button>

        <button
          onClick={() => setActiveTab('return')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'return'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Return Book & Calculate Fine</span>
          {activeLoans.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
              {activeLoans.length} active
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ISSUE BOOK */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issue Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Issue Book to Member</h3>
            <p className="text-xs text-slate-500 mb-6">
              Validates member account status, active loan limits, and inventory copy availability.
            </p>

            <form onSubmit={handleIssueSubmit} className="space-y-5">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Select Member *
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-blue-500"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option
                      key={m._id}
                      value={m._id}
                      disabled={!m.active || (m.activeLoansCount || 0) >= 3}
                    >
                      {m.name} ({m.memberId}) — {m.email} {!m.active ? '[DEACTIVATED]' : (m.activeLoansCount >= 3 ? '[LIMIT 3 REACHED]' : `(${m.activeLoansCount || 0} active loans)`)}
                    </option>
                  ))}
                </select>
                {selectedMember && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span>Email: <strong>{selectedMember.email}</strong></span>
                    <span>Status: <strong className={selectedMember.active ? 'text-emerald-600' : 'text-red-600'}>{selectedMember.active ? 'Active' : 'Inactive'}</strong></span>
                    <span>Active Loans: <strong>{selectedMember.activeLoansCount || 0} / 3</strong></span>
                  </div>
                )}
              </div>

              {/* Book Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Select Book to Issue *
                </label>
                <select
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-blue-500"
                >
                  <option value="">-- Choose Book --</option>
                  {books.map((b) => (
                    <option key={b._id} value={b._id} disabled={b.availableCopies <= 0}>
                      {b.title} ({b.isbn}) — {b.category} [{b.availableCopies}/{b.quantity} copies available] {b.availableCopies <= 0 ? '[OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
                {selectedBook && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span>Category: <strong>{selectedBook.category}</strong></span>
                    <span>ISBN: <strong className="font-mono">{selectedBook.isbn}</strong></span>
                    <span>
                      Copies Available: <strong className="text-blue-600">{selectedBook.availableCopies}</strong> of {selectedBook.quantity}
                    </span>
                  </div>
                )}
              </div>

              {/* Server Clock & Loan Period Calculation */}
              <div className="p-4 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-slate-900">
                  <Clock className="w-4 h-4 text-[#0F2942]" />
                  <span>
                    Circulation Date Calculation ({loanDays} Calendar Days — {selectedMember?.role || 'Standard'})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1 tabular-nums">
                  <div>
                    <span className="text-slate-500 block">Issue Date (Server Clock):</span>
                    <strong className="text-sm font-semibold">{today.toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Due Date (+{loanDays} Days):</span>
                    <strong className="text-sm font-semibold text-red-700">
                      {calculatedDueDate.toLocaleDateString()}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 pt-1">
                  • An issue confirmation notice will be sent to the member&apos;s registered email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={processing || !selectedMemberId || !selectedBookId}
                className="w-full py-2.5 px-4 bg-[#0F2942] hover:bg-[#17395B] text-white rounded text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{processing ? 'Processing Issue...' : 'Confirm Book Issue'}</span>
              </button>
            </form>
          </div>

          {/* Issue Receipt / Instructions Side Panel */}
          <div className="space-y-6">
            {issueReceipt ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Issue Transaction Complete</span>
                </div>
                <p className="text-xs mb-2">
                  <strong>Book:</strong> {issueReceipt.bookId?.title}
                </p>
                <p className="text-xs mb-2">
                  <strong>Member:</strong> {issueReceipt.memberId?.name} ({issueReceipt.memberId?.memberId})
                </p>
                <p className="text-xs mb-2">
                  <strong>Due Date:</strong> {new Date(issueReceipt.dueDate).toLocaleDateString()}
                </p>
                <div className="mt-3 p-2.5 rounded bg-emerald-100/60 text-emerald-800 text-xs">
                  Email receipt dispatched to <strong>{issueReceipt.memberId?.email}</strong> and relationship logged into Neo4j.
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-md border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#0F2942]" />
                  <span>Circulation Policy Checks</span>
                </h4>
                <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                  <li>Member account must be active and in good standing.</li>
                  <li>Title must have available shelf stock (copies &gt; 0).</li>
                  <li>Maximum active loan cap: 3 concurrent titles per member.</li>
                  <li>Faculty / Teachers retain titles for 45 days; Students for 7 days.</li>
                  <li>Inventory, Neo4j graph edge, and email notice update simultaneously.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RETURN BOOK */}
      {activeTab === 'return' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Return Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Process Book Return</h3>
            <p className="text-xs text-slate-500 mb-6">
              Calculates overdue days, charges ₹5/day fine, restores inventory, and logs receipt.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-5">
              {/* Select from active loans */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Active Borrow Record *
                </label>
                {activeLoans.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    No books are currently issued out on loan.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-emerald-500"
                  >
                    <option value="">-- Choose Active Loan --</option>
                    {activeLoans.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.bookId?.title} (Due: {new Date(l.dueDate).toLocaleDateString()}) — Borrowed by {l.memberId?.name} ({l.memberId?.memberId})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Optional Desk Date Override */}
              <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Return Date (Default: Current Server Date)
                  </label>
                  <span className="text-[11px] text-slate-500">Optional Counter Adjustment</span>
                </div>
                <input
                  type="date"
                  value={customReturnDate}
                  onChange={(e) => setCustomReturnDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-[#0F2942]"
                />
                <p className="text-[11px] text-slate-500">
                  Leave empty to evaluate against today&apos;s server date, or specify an adjusted return date if recording a backdated desk return.
                </p>
              </div>

              {/* Live Fine Evaluation Preview */}
              {selectedLoan && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    returnEvaluation.isLate
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center justify-between">
                    <span>Return Evaluation Preview</span>
                    <span className="font-mono text-base font-extrabold">
                      Fine: ₹{returnEvaluation.fine}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>Due Date: <strong>{new Date(selectedLoan.dueDate).toLocaleDateString()}</strong></div>
                    <div>Return Date: <strong>{returnEvaluation.returnDateStr}</strong></div>
                    <div>Overdue Duration: <strong>{returnEvaluation.overdueDays} calendar day(s)</strong></div>
                    <div>Formula: <strong>{returnEvaluation.overdueDays} days × ₹5</strong></div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={processing || !selectedLoanId}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>{processing ? 'Processing Return...' : 'Process Book Return'}</span>
              </button>
            </form>
          </div>

          {/* Return Receipt Side Panel */}
          <div className="space-y-6">
            {returnReceipt ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Return Receipt Recorded</span>
                </div>
                <p className="text-xs mb-2">
                  <strong>Overdue Days:</strong> {returnReceipt.overdueDays} day(s)
                </p>
                <p className="text-xs mb-2">
                  <strong>Final Fine Assessed:</strong> ₹{returnReceipt.fineAmount}
                </p>
                <div className="mt-3 p-2.5 rounded bg-emerald-100/60 text-emerald-800 text-xs">
                  Inventory restored by +1 copy. Email receipt dispatched to member and Neo4j relationship updated to RETURNED.
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs text-slate-600 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span>Section 4: Fine Rules Matrix</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>On or before due date:</span>
                    <strong className="text-emerald-600">₹0 fine (0 days)</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>1 day late:</span>
                    <strong className="text-red-600">₹5 fine (1 day)</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>3 days late:</span>
                    <strong className="text-red-600">₹15 fine (3 days)</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span>10 days late:</span>
                    <strong className="text-red-600">₹50 fine (10 days)</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-2 leading-relaxed">
                  Formula: <code>overdueDays = max(0, calendarDaysBetween(dueDate, returnDate))</code>
                  <br />
                  <code>fineAmount = overdueDays * 5</code>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueReturn;
