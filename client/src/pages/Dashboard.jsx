import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  Layers,
  ArrowRight,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { getDashboardStats, triggerCronScan } from '../services/api';

const Dashboard = ({ showToast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunCron = async () => {
    setCronRunning(true);
    try {
      const res = await triggerCronScan();
      showToast?.(
        `Overdue Scan Finished: ${res.data.sent} sent, ${res.data.skipped} already sent today.`,
        'success'
      );
      fetchStats();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setCronRunning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F2942] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading institutional metrics...</p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Formal Executive Header Strip */}
      <div className="bg-white rounded-xl border border-slate-200/90 border-l-4 border-l-[#0F2942] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 card-interactive">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Chief Librarian Command Desk
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Institutional Authority</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Library Executive Command Center
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Central circulation ledger, dual-database knowledge graph synchronization, and automated fine settlement oversight.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/issue-return"
            className="btn-press flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#0F2942] to-[#1E3A5F] hover:from-[#17395B] hover:to-[#254A78] text-white text-xs font-bold transition shadow-xs"
          >
            <span>Issue / Return Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleRunCron}
            disabled={cronRunning}
            title="Dispatch daily overdue notification job"
            className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Send className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin text-[#0F2942]' : ''}`} />
            <span>{cronRunning ? 'Dispatching...' : 'Run Overdue Notice Job'}</span>
          </button>
        </div>
      </div>

      {/* Pending Payment Verification Alert */}
      {s.pendingPaymentVerifications > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 border-l-4 border-l-amber-600 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                {s.pendingPaymentVerifications} Fee Payment(s) Awaiting Clearance
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Students or Faculty have submitted real-time UPI transaction reference numbers (UTR) awaiting Librarian approval.
              </p>
            </div>
          </div>
          <Link
            to="/overdue"
            className="btn-press px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <span>Review &amp; Approve</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Summary Grid (Interactive Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Catalog Titles"
          value={s.totalBooks || 0}
          subtitle={`${s.totalPhysicalCopies || 0} total physical copies`}
          icon={BookOpen}
          color="navy"
          to="/books"
        />
        <StatCard
          title="Available Stock"
          value={s.totalAvailableCopies || 0}
          subtitle="Ready for circulation"
          icon={CheckCircle}
          color="emerald"
          to="/books"
        />
        <StatCard
          title="Registered Members"
          value={s.totalMembers || 0}
          subtitle={`${s.activeMembers || 0} active accounts`}
          icon={Users}
          color="indigo"
          to="/members"
        />
        <StatCard
          title="Active Loans"
          value={s.currentlyIssuedBooks || 0}
          subtitle={`${s.totalLoansAllTime || 0} total all-time`}
          icon={Layers}
          color="purple"
          to="/borrow-history"
        />
        <StatCard
          title="Overdue Books"
          value={s.overdueBooks || 0}
          subtitle="Exceeded tenure limit"
          icon={AlertTriangle}
          color="red"
          to="/overdue"
        />
        <StatCard
          title="Unpaid Fines"
          value={`₹${s.outstandingFines || 0}`}
          subtitle={`₹${s.totalCollectedFines || 0} verified collected`}
          icon={IndianRupee}
          color="amber"
          to="/overdue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Circulation Ledger */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Recent Circulation Ledger
              </h3>
              <p className="text-xs text-slate-500">Real-time book issue and return audit trail</p>
            </div>
            <Link
              to="/borrow-history"
              className="btn-press text-xs font-bold text-[#0F2942] hover:text-[#17395B] flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Due / Return Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentActivity?.length > 0 ? (
                  data.recentActivity.map((item) => {
                    const isOverdue =
                      item.status === 'ISSUED' && new Date(item.dueDate) < new Date();
                    return (
                      <tr key={item._id} className="interactive-row hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.bookId?.title || 'Unknown Title'}
                          <span className="block text-[11px] font-mono text-slate-400 font-normal">
                            ISBN: {item.bookId?.isbn}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {item.memberId?.name || 'Unknown Member'}
                          <span className="block text-[11px] font-mono text-slate-400">
                            {item.memberId?.memberId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              item.status === 'ISSUED'
                                ? isOverdue
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-sky-50 text-sky-900 border-sky-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {item.status === 'ISSUED' && isOverdue ? 'Overdue' : item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 tabular-nums">
                          {item.status === 'RETURNED'
                            ? new Date(item.returnDate).toLocaleDateString()
                            : new Date(item.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No circulation records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category & Notification Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Inventory by Subject
            </h3>
            <p className="text-xs text-slate-500 pb-3 mb-3 border-b border-slate-100">
              Registered catalog distribution
            </p>
            <div className="space-y-2">
              {data?.categoryStats?.length > 0 ? (
                data.categoryStats.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                  >
                    <span className="font-semibold text-slate-700">{cat._id || 'General'}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-slate-400 text-[11px]">{cat.totalCopies} copies</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                        {cat.count}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No catalog categories indexed.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Recent Notifications
              </h3>
              <Link to="/emails" className="text-xs text-[#0F2942] font-bold hover:underline">
                View Audit
              </Link>
            </div>
            <div className="space-y-2.5">
              {data?.recentEmails?.length > 0 ? (
                data.recentEmails.map((em) => (
                  <div
                    key={em.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-2.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{em.subject}</p>
                      <p className="text-[11px] text-slate-500 truncate">To: {em.recipient}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No automated notifications dispatched in current session.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
