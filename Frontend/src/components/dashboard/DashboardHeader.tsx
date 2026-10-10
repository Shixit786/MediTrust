import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { USE_MOCK } from '../../services/api';

export const DashboardHeader: React.FC = React.memo(() => {
  return (
    <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#0A0A0A]">
      {/* Left: Tag + Heading + Subtitle */}
      <div className="flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
          <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
            COMMAND CENTER
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none mb-4">
          <RevealText delay={0.05} stagger={0.08} duration={0.6}>
            Dashboard
          </RevealText>
        </h1>

        <p className="text-base sm:text-lg text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-xl">
          Three shields watching. One engine connecting the dots.
        </p>
      </div>

      {/* Right side: Status chips */}
      <div className="flex flex-wrap items-center gap-3">
        {/* System online status chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#0A0A0A] select-none">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="font-mono-label text-[11px] text-[#0A0A0A] font-semibold">
            SYSTEM ONLINE
          </span>
        </div>

        {/* Demo Data indicator */}
        {USE_MOCK && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0037FF]/8 border border-[#0037FF]/30 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-[11px] font-semibold">
              DEMO DATA
            </MonoLabel>
          </div>
        )}
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
