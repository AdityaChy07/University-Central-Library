import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users2,
  UserCheck,
  ArrowLeftRight,
  History,
  AlertTriangle,
  Network,
  MailCheck,
  GraduationCap,
  UserCog,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ overdueCount = 0 }) => {
  const { user } = useAuth();

  let navItems = [];
  let portalSectionTitle = 'PORTAL NAVIGATION';
  let roleSubtitle = 'Central Administration';

  if (user?.role === 'STUDENT') {
    portalSectionTitle = 'STUDENT PORTAL';
    roleSubtitle = '7-Day Lending Rule';
    navItems = [
      { to: '/student-dashboard', label: 'Overview & Fee Clearance', icon: LayoutDashboard },
      { to: '/books', label: 'Library Catalog', icon: BookOpen },
      { to: '/borrow-history', label: 'Circulation Ledger', icon: History },
      { to: '/profile', label: 'Profile & Security', icon: UserCog },
    ];
  } else if (user?.role === 'TEACHER') {
    portalSectionTitle = 'FACULTY PORTAL';
    roleSubtitle = '45-Day Lending Rule';
    navItems = [
      { to: '/teacher-dashboard', label: 'Faculty Circulation Desk', icon: GraduationCap },
      { to: '/books', label: 'Academic Catalog', icon: BookOpen },
      { to: '/authors', label: 'Authors Directory', icon: Users2 },
      { to: '/borrow-history', label: 'Loan Ledger', icon: History },
      { to: '/graph-explorer', label: 'Knowledge Graph', icon: Network },
      { to: '/profile', label: 'Profile & Security', icon: UserCog },
    ];
  } else {
    portalSectionTitle = 'ADMINISTRATION';
    roleSubtitle = 'Chief Librarian Authority';
    navItems = [
      { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
      { to: '/books', label: 'Catalog Inventory', icon: BookOpen },
      { to: '/authors', label: 'Authors Registry', icon: Users2 },
      { to: '/members', label: 'Member Directory', icon: UserCheck },
      { to: '/issue-return', label: 'Issue & Return Desk', icon: ArrowLeftRight },
      { to: '/borrow-history', label: 'Circulation Ledger', icon: History },
      {
        to: '/overdue',
        label: 'Overdue & Fee Verification',
        icon: AlertTriangle,
        badge: overdueCount > 0 ? overdueCount : null,
      },
      { to: '/graph-explorer', label: 'Knowledge Graph', icon: Network },
      { to: '/emails', label: 'Notification Audit', icon: MailCheck },
      { to: '/profile', label: 'Profile & Security', icon: UserCog },
    ];
  }

  return (
    <aside className="w-64 bg-[#0F2942] text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-[#1B3A57] select-none">
      {/* Role Context Header */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-black/10">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            {portalSectionTitle}
          </div>
          <span className="text-[10px] font-medium text-slate-400">{roleSubtitle}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/12 text-white border-l-3 border-amber-400 font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-white/6 hover:text-white border-l-3 border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span className="relative flex h-5 min-w-[20px] px-1.5 items-center justify-center text-[10px] font-bold rounded-full bg-red-600 text-white tabular-nums shadow-xs">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative">{item.badge}</span>
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Institutional Lending Policy Notice */}
      <div className="p-3 border-t border-white/10 bg-black/15 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[10px] uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Circulation Protocols</span>
        </div>
        <p className="text-slate-400 leading-snug">
          Students retain books for <strong>14 days</strong>; Faculty retain books for{' '}
          <strong>45 days</strong>. Late fine: ₹5/day after due date.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
