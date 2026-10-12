import React from 'react';
import { Link } from 'react-router-dom';
import { MonoLabel } from '../components/ui/MonoLabel';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = React.memo(() => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 flex flex-col items-start gap-8 min-h-[calc(100vh-280px)] justify-center">
      {/* Top indicator */}
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
        <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-wider">
          ROUTING // HTTP 404
        </MonoLabel>
      </div>

      <div className="w-14 h-14 rounded-[18px] bg-white border border-[#0A0A0A] flex items-center justify-center text-[#0A0A0A] shadow-sm">
        <FileQuestion className="w-7 h-7" strokeWidth={1.5} />
      </div>

      <div>
        <span className="font-mono text-xs sm:text-sm text-[#6B6F76] tracking-widest uppercase block mb-3 font-semibold">
          ENDPOINT UNRESOLVED
        </span>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight leading-none text-[#0A0A0A]">
          PAGE NOT FOUND
        </h1>
      </div>

      <p className="text-base sm:text-lg text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-xl">
        The requested security intelligence vector or page route could not be located in the
        unified routing directory.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 pt-4">
        <Link
          to="/"
          className="px-6 py-3.5 rounded-[16px] bg-[#0A0A0A] text-white hover:bg-[#202020] transition-colors font-mono text-xs font-semibold tracking-wider flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>RETURN HOME</span>
        </Link>

        <Link
          to="/dashboard"
          className="px-6 py-3.5 rounded-[16px] bg-white border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors font-mono text-xs font-semibold tracking-wider flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>OPEN DASHBOARD</span>
        </Link>
      </div>

      <div className="pt-8 border-t border-[#0A0A0A]/10 w-full flex justify-between items-center text-xs font-mono text-[#6B6F76]">
        <span>ALL ACTIVE SHIELDS MONITORED</span>
        <span className="text-[#0037FF]">EARLY WARNING, NOT PROOF</span>
      </div>
    </div>
  );
});

NotFoundPage.displayName = 'NotFoundPage';
