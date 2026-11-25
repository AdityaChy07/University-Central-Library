import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Clock,
  Search,
  CheckCircle2,
  BookmarkCheck,
  QrCode,
  Receipt,
  UserCog,
  X,
  GraduationCap,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { getBorrowHistory, getBooks } from '../services/api';
import UpiPaymentModal from '../components/UpiPaymentModal';

const TeacherDashboard = ({ showToast }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCatalog, setSearchCatalog] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [payingRecord, setPayingRecord] = useState(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [historyRes, booksRes] = await Promise.all([
        getBorrowHistory({ memberId: user._id }),
        getBooks({ search: searchCatalog }),
      ]);
      setLoans(historyRes.data?.data || []);
      setBooks(booksRes.data?.data || []);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, searchCatalog]);

  const activeLoans = loans.filter((l) => l.status === 'ISSUED');
  const returnedWithFines = loans.filter(
    (l) => l.status === 'RETURNED' && (l.fineAmount > 0 || l.paymentStatus === 'PENDING_VERIFICATION')
  );

  const unpaidFines = loans
    .filter((l) => (l.fineAmount > 0 || l.currentEstimatedFine > 0) && !l.finePaid)
    .reduce((sum, l) => sum + (l.currentEstimatedFine || l.fineAmount || 0), 0);

  const renderPaymentAction = (loan) => {
    const fineAmt = loan.currentEstimatedFine || loan.fineAmount || 0;
    const pStatus = loan.paymentStatus || (loan.finePaid ? 'PAID' : 'UNPAID');

    if (pStatus === 'PAID' || loan.finePaid) {
      return (
        <button
          onClick={() => setPayingRecord(loan)}
          className="btn-press px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Paid • View Receipt</span>
        </button>
      );
    }

    if (pStatus === 'PENDING_VERIFICATION') {
      return (
        <button
          onClick={() => setPayingRecord(loan)}
          className="btn-press px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Verification</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setPayingRecord(loan)}
        className="btn-press px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs animate-pulse"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Pay Due via UPI (₹{fineAmt})</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Faculty Profile Summary Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 border-l-4 border-l-[#0F2942] p-5 shadow-xs card-interactive">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                <span>Faculty Circulation Desk</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">45-Day Extended Academic Retention Rule</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {user?.name}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Faculty ID: <span className="font-mono font-semibold text-slate-800">{user?.memberId}</span> • Department: {user?.department || 'Academic Faculty'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/profile"
              className="btn-press px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <UserCog className="w-3.5 h-3.5 text-[#0F2942]" />
              <span>Profile &amp; Password</span>
            </Link>
          </div>
        </div>

        {/* Structured Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
            <span className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block mb-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Faculty Loan Privilege</span>
            </span>
            <strong className="text-sm font-bold text-[#0F2942]">45 Calendar Days</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
              Active Course Loans
            </span>
            <strong className="text-sm font-bold text-slate-900 tabular-nums">{activeLoans.length} / 3 Max</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
              Post-Tenure Tariff
            </span>
            <strong className="text-sm font-bold text-slate-900">₹5 / Day</strong>
          </div>
          <div className={`p-2.5 rounded-lg border ${unpaidFines > 0 ? 'bg-red-50/80 border-red-200 text-red-800' : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'}`}>
            <span className="text-[10px] uppercase tracking-wider font-bold block mb-0.5">
              Faculty Dues
            </span>
            <strong className="text-sm font-bold tabular-nums">
              ₹{unpaidFines} {unpaidFines > 0 ? '• Payment Due' : '• Clear'}
            </strong>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACTIVE RESEARCH LOANS */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="pb-3 mb-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0F2942]" />
            <span>Borrowed Research Textbooks ({activeLoans.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty members enjoy a 45-calendar-day retention window per volume for semester-long syllabus preparation.
          </p>
        </div>

        {loading && loans.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading faculty loans...</div>
        ) : activeLoans.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <span className="font-semibold text-slate-700 block">No Active Research Loans</span>
            <span>You currently have zero active borrowings. Select titles from the academic catalog below.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLoans.map((loan) => {
              const due = new Date(loan.dueDate);
              const now = new Date();
              const isOverdue = loan.isCurrentlyOverdue || due < now;
              const fineAmt = loan.currentEstimatedFine || loan.fineAmount || 0;
              const daysRemaining = Math.max(0, Math.round((due - now) / (1000 * 60 * 60 * 24)));
              const progressPct = isOverdue
                ? 100
                : Math.min(100, Math.max(5, Math.round(((45 - daysRemaining) / 45) * 100)));

              return (
                <div
                  key={loan._id}
                  className={`p-4 rounded-xl border transition-all card-interactive ${
                    isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{loan.bookId?.title}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        ISBN: {loan.bookId?.isbn} • {loan.bookId?.category}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        isOverdue
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-sky-100 text-sky-900 border-sky-300'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : '45-Day Loan'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/70 mb-3 tabular-nums">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Issue Date:</span>
                      <strong>{new Date(loan.issueDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Due Date (+45 Days):</span>
                      <strong className={isOverdue ? 'text-red-700' : 'text-slate-900'}>
                        {due.toLocaleDateString()}
                      </strong>
                    </div>
                  </div>

                  {isOverdue ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-red-200 text-slate-900 text-xs gap-2 flex-wrap shadow-2xs">
                      <div>
                        <span>
                          Assessed Fine: <strong className="text-red-700 tabular-nums">₹{fineAmt}</strong>
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {loan.currentOverdueDays || loan.overdueDays || 0} days past 45-day window
                        </span>
                      </div>
                      {renderPaymentAction(loan)}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs flex items-center justify-between tabular-nums">
                        <span className="font-medium text-slate-500">Remaining Tenure:</span>
                        <strong className="font-bold text-[#0F2942]">{daysRemaining} calendar day(s)</strong>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0F2942] to-sky-700 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 1B: FEE PAYMENT HISTORY */}
      {returnedWithFines.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0F2942]" />
            <span>Faculty Fee Settlement History ({returnedWithFines.length})</span>
          </h3>
          <div className="space-y-2.5">
            {returnedWithFines.map((loan) => (
              <div
                key={loan._id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 interactive-row"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{loan.bookId?.title}</div>
                  <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                    Returned: {new Date(loan.returnDate).toLocaleDateString()} • Fine: <strong>₹{loan.fineAmount}</strong>
                    {loan.paymentUtr ? ` • UTR: ${loan.paymentUtr}` : ''}
                  </div>
                </div>
                {renderPaymentAction(loan)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: ACADEMIC CATALOG */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#0F2942]" />
              <span>University Library Catalog &amp; Availability</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect shelf inventory and projected return dates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'AVAILABLE', label: 'Available' },
                { key: 'ISSUED', label: 'Loaned' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAvailabilityFilter(tab.key)}
                  className={`btn-press px-2.5 py-1 rounded-md transition cursor-pointer ${
                    availabilityFilter === tab.key
                      ? 'bg-white text-[#0F2942] shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search books, authors, ISBN..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F2942] focus:ring-1 focus:ring-[#0F2942] shadow-2xs transition"
              />
              {searchCatalog && (
                <button
                  type="button"
                  onClick={() => setSearchCatalog('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Book Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 text-center">Shelf Stock</th>
                <th className="px-4 py-3">Availability Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books
                .filter((b) => {
                  if (availabilityFilter === 'AVAILABLE') return b.availableCopies > 0;
                  if (availabilityFilter === 'ISSUED') return b.availableCopies === 0;
                  return true;
                })
                .map((b) => {
                  const isAvailable = b.availableCopies > 0;
                  return (
                    <tr key={b._id} className="interactive-row hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{b.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ISBN: {b.isbn}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {b.authorId?.name || 'Academic Author'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {b.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isAvailable ? `${b.availableCopies} Available` : 'All Issued'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAvailable ? (
                          <div className="text-emerald-800 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Available on Shelves</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-950">
                            <div className="font-bold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-amber-700" />
                              <span>{b.allocationStatus}</span>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared UPI Payment Modal */}
      <UpiPaymentModal
        record={payingRecord}
        user={user}
        onClose={() => setPayingRecord(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />
    </div>
  );
};

export default TeacherDashboard;
