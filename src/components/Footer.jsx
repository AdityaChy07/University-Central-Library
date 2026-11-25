import React from 'react';
import { Landmark, Sparkles, ShieldCheck } from 'lucide-react';

const Footer = ({ dark = false }) => {
  return (
    <footer
      className={`border-t px-6 py-4 text-xs transition-colors ${
        dark
          ? 'border-slate-300 bg-white/90 text-slate-600 backdrop-blur-md'
          : 'border-slate-200/90 bg-white/95 text-slate-500 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Institutional Authority Brand */}
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded bg-[#0F2942] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-800 tracking-tight">
              University Central Library
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-500 text-[11px]">
              Circulation, Catalog &amp; Knowledge Graph System
            </span>
          </div>
        </div>

        {/* Made by Aditya Signature Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            Designed &amp; Engineered by
          </span>
          <div
            title="Crafted with precision by Aditya"
            className="aditya-signature-badge cursor-default select-none"
          >
            <Sparkles className="w-3 h-3 text-amber-300 shrink-0 animate-pulse" />
            <span>Made by Aditya</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
