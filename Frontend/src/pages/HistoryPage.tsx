import React from 'react';
import { MonoLabel } from '../components/ui/MonoLabel';
import { ArrowLink } from '../components/ui/ArrowLink';
import { HardDrive } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 min-h-[calc(100vh-220px)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF] animate-pulse" />
          <MonoLabel color="accent" className="text-sm font-semibold tracking-widest">
            COMING NEXT
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mb-8">
          History
        </h1>

        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed mb-12">
          Local browser-persisted historical threat logs, audit trails, exportable forensic bundles, and previous multi-vector incident comparisons will be available here.
        </p>

        <div className="p-8 rounded-[20px] bg-white/80 border border-[#0A0A0A] max-w-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-5 h-5 text-[#0037FF]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              LOCAL STORAGE ARCHIVE
            </MonoLabel>
          </div>
          <div className="space-y-3 font-mono-label text-xs text-[#6B6F76]">
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>PERSISTENCE</span>
              <span className="text-[#0A0A0A]">INDEXEDDB + LOCAL STORAGE</span>
            </div>
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>ENCRYPTION</span>
              <span className="text-[#0A0A0A]">AES-GCM LOCAL VAULT</span>
            </div>
            <div className="flex justify-between">
              <span>RECORDS FOUND</span>
              <span className="text-[#0037FF]">00 LOGGED ATTACKS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0A0A0A] pt-8 mt-12 flex justify-between items-center">
        <MonoLabel color="muted">PREPARED FOR HISTORY LOG INTEGRATION</MonoLabel>
        <ArrowLink to="/dashboard" size="md">
          GO TO DASHBOARD
        </ArrowLink>
      </div>
    </div>
  );
};
