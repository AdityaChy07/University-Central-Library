import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pingServerHealth } from '../services/api';
import {
  ArrowRight,
  Landmark,
  ShieldCheck,
  Eye,
  EyeOff,
  BookOpenCheck,
  Clock,
  QrCode,
  GraduationCap,
  UserCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import Footer from '../components/Footer';

const Login = ({ showToast }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverReady, setServerReady] = useState(null); // null = waking up, true = ready, false = unreachable
  const { login } = useAuth();
  const navigate = useNavigate();

  // Pre-warm cloud API server immediately when Login page opens
  useEffect(() => {
    let active = true;
    pingServerHealth()
      .then(() => {
        if (active) setServerReady(true);
      })
      .catch(() => {
        if (active) setServerReady(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const redirectByRole = (role) => {
    if (role === 'TEACHER') {
      navigate('/teacher-dashboard');
    } else if (role === 'STUDENT') {
      navigate('/student-dashboard');
    } else {
      navigate('/');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showToast?.('Please enter your Unique Member ID (or Email) and password.', 'error');
      return;
    }

    setSubmitting(true);
    const res = await login(identifier, password);
    setSubmitting(false);

    if (res.success) {
      showToast?.(`Authenticated as ${res.user.name} (${res.user.role}).`, 'success');
      redirectByRole(res.user.role);
    } else {
      showToast?.(res.message, 'error');
    }
  };

  const quickFill = (id, pwd, label) => {
    setIdentifier(id);
    setPassword(pwd);
    showToast?.(`Loaded credentials for ${label}. Click Sign In!`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#f1f4f8] flex flex-col justify-between">
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full bg-white rounded-xl border border-slate-300 shadow-[0_12px_36px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-5 transition-all">
          {/* Left Institutional Overview Panel */}
          <div className="md:col-span-2 bg-[#0F2942] text-white p-6 sm:p-8 flex flex-col justify-between border-b-4 md:border-b-0 md:border-r-3 border-amber-500 relative overflow-hidden">
            {/* Subtle background ambient graphic */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none blur-2xl"></div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-[#173859] to-[#0A1B2D] border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-md">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    Institutional Portal
                  </div>
                  <h1 className="text-lg font-bold tracking-tight leading-tight">
                    University Central Library
                  </h1>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-amber-200 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>{greeting}, Scholar / Faculty</span>
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Verify your university credentials to access personalized circulation records, book allocation schedules, and digital UPI fee clearance.
                </p>
              </div>

              {/* Interactive Policy Highlights */}
              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-lg bg-white/6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">Distinct Retention Windows</div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      <strong>45 calendar days</strong> for Faculty • <strong>7 calendar days</strong> for Students
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-start gap-3">
                  <BookOpenCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">Live Allotment Forecasts</div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      Inspect exact expected return dates for reserved and borrowed books
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-start gap-3">
                  <QrCode className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">Real-Time UPI QR Payment</div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      Scan via GPay / PhonePe / Paytm with instant UTR verification
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Academic Session 2026-27</span>
              <span className="font-mono text-amber-200/80">
                {new Date().toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Right Sign-In Form */}
          <div className="md:col-span-3 p-6 sm:p-8 flex flex-col justify-center space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Secure Access Gate
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      serverReady === true
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : serverReady === null
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-red-700 bg-red-50 border-red-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        serverReady === true
                          ? 'bg-emerald-500'
                          : serverReady === null
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-red-500'
                      }`}
                    />
                    <span>
                      {serverReady === true
                        ? 'API Ready'
                        : serverReady === null
                        ? 'Waking Server...'
                        : 'Server Standby'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Encrypted RBAC</span>
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Member Identity Verification
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Sign in with the Unique Member ID (or Email) and Password assigned by the Chief Librarian.
              </p>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Fill for Demonstration:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('STU-201', 'Student@123', 'Aditya Choudhary (Student)')}
                  className="btn-press px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 hover:border-[#0F2942] hover:text-[#0F2942] text-slate-700 shadow-2xs transition flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Aditya (Student)</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('TEA-101', 'Teacher@123', 'Dr. S. Radhakrishnan (Faculty)')}
                  className="btn-press px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 hover:border-[#0F2942] hover:text-[#0F2942] text-slate-700 shadow-2xs transition flex items-center gap-1"
                >
                  <GraduationCap className="w-3 h-3 text-sky-600" />
                  <span>Dr. Radhakrishnan (Faculty)</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('LIB-001', 'Admin@123', 'Chief Librarian (Admin)')}
                  className="btn-press px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 hover:border-[#0F2942] hover:text-[#0F2942] text-slate-700 shadow-2xs transition flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3 text-amber-600" />
                  <span>Chief Librarian</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unique Member ID or Institutional Email *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. STU-201, TEA-101, or aditya.choudhary@student.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F2942] focus:ring-2 focus:ring-[#0F2942]/15 font-medium transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F2942] focus:ring-2 focus:ring-[#0F2942]/15 font-medium transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-press w-full py-2.5 px-4 bg-gradient-to-r from-[#0F2942] to-[#1E3A5F] hover:from-[#17395B] hover:to-[#254A78] text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{submitting ? 'Verifying Credentials...' : 'Sign In to Library Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-start gap-2.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-[#0F2942] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Only accounts registered by the <strong>Chief Librarian</strong> can access this system. Once authenticated, members can update their contact details and password securely under <strong>Profile &amp; Security</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer dark />
    </div>
  );
};

export default Login;
