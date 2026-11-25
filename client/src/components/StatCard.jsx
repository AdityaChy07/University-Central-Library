import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'navy', trend, to }) => {
  const accentMap = {
    navy: {
      border: 'border-t-[#0F2942]',
      text: 'text-[#0F2942]',
      bg: 'bg-[#0F2942]/10',
      glow: 'group-hover:border-t-[#0F2942]',
    },
    blue: {
      border: 'border-t-sky-700',
      text: 'text-sky-800',
      bg: 'bg-sky-50',
      glow: 'group-hover:border-t-sky-700',
    },
    emerald: {
      border: 'border-t-emerald-600',
      text: 'text-emerald-800',
      bg: 'bg-emerald-50',
      glow: 'group-hover:border-t-emerald-600',
    },
    amber: {
      border: 'border-t-amber-600',
      text: 'text-amber-800',
      bg: 'bg-amber-50',
      glow: 'group-hover:border-t-amber-600',
    },
    red: {
      border: 'border-t-red-600',
      text: 'text-red-800',
      bg: 'bg-red-50',
      glow: 'group-hover:border-t-red-600',
    },
    purple: {
      border: 'border-t-purple-700',
      text: 'text-purple-800',
      bg: 'bg-purple-50',
      glow: 'group-hover:border-t-purple-700',
    },
  };

  const accent = accentMap[color] || accentMap.navy;

  const content = (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`h-7 w-7 rounded-md ${accent.bg} ${accent.text} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="w-4 h-4 opacity-90" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
            {value}
          </span>
          {trend && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {trend}
            </span>
          )}
        </div>
        {to && (
          <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#0F2942] group-hover:bg-slate-100 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
          {subtitle}
        </p>
      )}
    </>
  );

  const baseClass = `group block bg-white rounded-lg border border-slate-200/90 border-t-3 ${
    accent.border
  } p-4.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] card-interactive ${
    to ? 'cursor-pointer' : ''
  }`;

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
};

export default StatCard;
