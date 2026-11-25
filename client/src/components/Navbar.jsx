import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Network, RefreshCw, LogOut, LogIn, Landmark, RotateCcw, ChevronRight } from 'lucide-react';
import { getSystemStatus, seedDemoDatabase, syncFullGraph } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onRefreshData, showToast }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    mongodb: { connected: false },
    neo4j: { connected: false },
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await getSystemStatus();
      if (res.data?.databases) {
        setStatus(res.data.databases);
      }
    } catch (err) {
      console.warn('Navbar status fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    if (
      !window.confirm(
        'Reset database to clean baseline institutional records? Existing custom entries will be overwritten.'
      )
    ) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await seedDemoDatabase();
      showToast?.(res.data.message || 'Baseline institutional data initialized.', 'success');
      fetchStatus();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSyncGraph = async () => {
    setIsSyncing(true);
    try {
      const res = await syncFullGraph();
      showToast?.(res.data.message || 'Graph database synchronized.', 'success');
      fetchStatus();
      onRefreshData?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 glass-header border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-all">
      {/* Institutional Brand Masthead */}
      <Link
        to={user?.role === 'STUDENT' ? '/student-dashboard' : user?.role === 'TEACHER' ? '/teacher-dashboard' : '/'}
        className="flex items-center gap-3 group"
      >
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#0F2942] to-[#1E3A5F] text-amber-300 flex items-center justify-center border border-[#1E3A5F] shadow-xs group-hover:scale-105 transition-transform duration-200">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight group-hover:text-[#0F2942] transition-colors">
              University Central Library
            </h1>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-200">
              Institutional
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Circulation, Registry &amp; Knowledge Graph Portal
          </p>
        </div>
      </Link>

      {/* Right Telemetry & Account Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Real-Time Database Health Telemetry */}
        <div className="hidden md:flex items-center gap-2 border-r border-slate-200 pr-3">
          {/* MongoDB Atlas Indicator */}
          {(() => {
            const isAtlasLive =
              status.mongodb?.realAtlasConnected === true || status.mongodb?.mode === 'ATLAS';
            return (
              <div
                title={
                  isAtlasLive
                    ? `MongoDB Atlas Connected: ${status.mongodb?.host || 'Cluster0'}`
                    : status.mongodb?.atlasError
                    ? `Fallback Mode — Atlas Error: ${status.mongodb.atlasError}`
                    : 'Running in Local Fallback Mode (MongoDB Atlas disconnected)'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-help ${
                  isAtlasLive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isAtlasLive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isAtlasLive ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <Database className="w-3 h-3 opacity-80" />
                <span className="font-semibold">
                  {isAtlasLive ? 'Atlas: Online' : 'DB: Fallback Mode'}
                </span>
              </div>
            );
          })()}

          {/* Neo4j Indicator */}
          <div
            title={
              status.neo4j?.connected
                ? 'Neo4j Graph Database: Active & Synchronized'
                : 'Neo4j Graph: MongoDB Projection Mode (Active Fallback)'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-help ${
              status.neo4j?.connected
                ? 'bg-sky-50 text-sky-900 border-sky-200 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {status.neo4j?.connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status.neo4j?.connected ? 'bg-sky-500' : 'bg-slate-400'
                }`}
              ></span>
            </span>
            <Network className="w-3 h-3 opacity-80" />
            <span className="font-semibold">
              Neo4j: {status.neo4j?.connected ? 'Active' : 'Fallback'}
            </span>
          </div>
        </div>

        {/* Librarian Operational Quick Actions */}
        {(!user || user.role === 'LIBRARIAN') && (
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={handleSyncGraph}
              disabled={isSyncing}
              title="Synchronize relational data to Neo4j graph engine"
              className="btn-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#0F2942]' : ''}`} />
              <span>Sync Graph</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSeeding}
              title="Reset baseline catalog and core institutional accounts"
              className="btn-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin text-[#0F2942]' : ''}`} />
              <span>{isSeeding ? 'Resetting...' : 'Reset Baseline'}</span>
            </button>
          </div>
        )}

        {/* User Identity Pill & Logout */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              to="/profile"
              title="View Account Profile & Password Settings"
              className="group flex items-center gap-2.5 hover:bg-slate-100/80 px-2 py-1 rounded-lg transition"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0F2942] to-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                {userInitial}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight group-hover:text-[#0F2942] transition-colors">
                  {user.name}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {user.memberId} • <span className="text-amber-700">{user.role}</span>
                </span>
              </div>
            </Link>
            <button
              onClick={() => {
                logout();
                showToast?.('Signed out of portal.', 'info');
                navigate('/login');
              }}
              title="Sign Out of Session"
              className="btn-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50/60 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn-press flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold shadow-xs transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
