import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';

const CURRENT_YEAR = 2026;

export const Footer: React.FC = React.memo(() => {
  return (
    <footer className="relative z-10 w-full border-t border-[#0A0A0A] bg-[#F0F0F0]/92 mt-20">
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-['Inter_Tight'] font-bold text-xl tracking-tighter text-[#0A0A0A]">
              meditrust
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            <MonoLabel color="muted" className="text-[11px]">
              SYSTEMS ACTIVE
            </MonoLabel>
          </div>
          <p className="text-sm text-[#6B6F76] font-normal max-w-md">
            Unified AI early-warning system designed to protect digital healthcare patients and providers from coordinated multi-channel fraud.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div className="flex flex-col gap-1">
            <MonoLabel color="subtle" className="text-[10px]">ARCHITECTURE</MonoLabel>
            <span className="font-['Inter_Tight'] text-sm font-medium text-[#0A0A0A]">Cross-Shield Fusion Engine</span>
          </div>
          <div className="flex flex-col gap-1">
            <MonoLabel color="subtle" className="text-[10px]">TELEMETRY</MonoLabel>
            <span className="font-['Inter_Tight'] text-sm font-medium text-[#0A0A0A]">Zero Telecom Intrusion</span>
          </div>
          <div className="flex flex-col gap-1">
            <MonoLabel color="subtle" className="text-[10px]">COMPLIANCE</MonoLabel>
            <span className="font-['Inter_Tight'] text-sm font-medium text-[#0A0A0A]">HIPAA & HITECH Compatible</span>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-[#0A0A0A]/10 py-6">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6B6F76]">
          <MonoLabel color="muted" className="text-[11px]">
            © {CURRENT_YEAR} MEDITRUST AI LABS · ALL RIGHTS RESERVED
          </MonoLabel>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-[#0037FF] transition-colors">Privacy Shield</a>
            <a href="#terms" className="hover:text-[#0037FF] transition-colors">Security Protocol</a>
            <a href="#api" className="hover:text-[#0037FF] transition-colors">Telemetry API</a>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
