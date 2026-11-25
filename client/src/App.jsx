import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Authors from './pages/Authors';
import Members from './pages/Members';
import IssueReturn from './pages/IssueReturn';
import BorrowHistory from './pages/BorrowHistory';
import OverdueBooks from './pages/OverdueBooks';
import GraphExplorer from './pages/GraphExplorer';
import EmailLogs from './pages/EmailLogs';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Profile from './pages/Profile';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getOverdueLoans } from './services/api';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function AppContent() {
  const [toast, setToast] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((curr) => (curr?.id === Date.now() ? null : curr));
    }, 4500);
  };

  const fetchOverdueCount = async () => {
    try {
      const res = await getOverdueLoans();
      setOverdueCount(res.data?.count || 0);
    } catch (err) {
      // offline silent
    }
  };

  useEffect(() => {
    fetchOverdueCount();
  }, [refreshKey]);

  const handleGlobalRefresh = () => {
    setRefreshKey((k) => k + 1);
    fetchOverdueCount();
  };

  const isLoginPage = location.pathname === '/login';

  // Mandatory Authentication Gate: First verify who you are before accessing any dashboard or library service
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f5f8] flex flex-col justify-center antialiased">
        <Login showToast={showToast} />
        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 bg-white border-slate-200 text-slate-800">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar onRefreshData={handleGlobalRefresh} showToast={showToast} />

      {/* Body Layout */}
      <div className="flex-1 flex">
        {/* Left Persistent Sidebar (hidden on login page) */}
        {!isLoginPage && <Sidebar overdueCount={overdueCount} />}

        {/* Main Content Area + Institutional Footer */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/login" element={<Login showToast={showToast} />} />

            {/* Role-Specific Dashboards */}
            <Route
              path="/student-dashboard"
              element={<StudentDashboard showToast={showToast} />}
            />
            <Route
              path="/teacher-dashboard"
              element={<TeacherDashboard showToast={showToast} />}
            />

            {/* General & Admin Routes */}
            <Route
              path="/"
              element={
                user?.role === 'STUDENT' ? (
                  <Navigate to="/student-dashboard" replace />
                ) : user?.role === 'TEACHER' ? (
                  <Navigate to="/teacher-dashboard" replace />
                ) : (
                  <Dashboard
                    key={refreshKey}
                    showToast={showToast}
                    onRefreshData={handleGlobalRefresh}
                  />
                )
              }
            />
            <Route
              path="/books"
              element={<Books showToast={showToast} onRefreshData={handleGlobalRefresh} />}
            />
            <Route
              path="/authors"
              element={<Authors showToast={showToast} onRefreshData={handleGlobalRefresh} />}
            />
            <Route
              path="/members"
              element={<Members showToast={showToast} onRefreshData={handleGlobalRefresh} />}
            />
            <Route
              path="/issue-return"
              element={<IssueReturn showToast={showToast} onRefreshData={handleGlobalRefresh} />}
            />
            <Route
              path="/borrow-history"
              element={<BorrowHistory showToast={showToast} />}
            />
            <Route
              path="/overdue"
              element={<OverdueBooks showToast={showToast} onRefreshData={handleGlobalRefresh} />}
            />
            <Route
              path="/graph-explorer"
              element={<GraphExplorer showToast={showToast} />}
            />
            <Route path="/emails" element={<EmailLogs showToast={showToast} />} />
            <Route path="/profile" element={<Profile showToast={showToast} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
          <Footer />
        </div>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 bg-white border-slate-200 text-slate-800">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
