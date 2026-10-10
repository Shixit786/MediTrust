import React from 'react';
import { MonoLabel } from '../components/ui/MonoLabel';
import { ArrowLink } from '../components/ui/ArrowLink';
import { Cpu } from 'lucide-react';

export const FusionEnginePage: React.FC = React.memo(() => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 min-h-[calc(100vh-220px)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
          <MonoLabel color="accent" className="text-sm font-semibold tracking-widest">
            COMING NEXT
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mb-8">
          Fusion Engine
        </h1>

        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed mb-12">
          The central intelligence integration layer that consumes risk vectors from Voice Shield, Job Shield, and SIM Guard, calculates cross-vector correlation scores, reconstructs attack chains, and delivers actionable clinical defense responses.
        </p>

        <div className="p-8 rounded-[20px] bg-white border border-[#0A0A0A] max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-[#0037FF]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              SPECIFICATION // FUSION ENGINE
            </MonoLabel>
          </div>
          <div className="space-y-3 font-mono-label text-xs text-[#6B6F76]">
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>INPUT SIGNALS</span>
              <span className="text-[#0A0A0A]">VOICE + JOB + SIM VECTORS</span>
            </div>
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>ATTACK RECONSTRUCTION</span>
              <span className="text-[#0A0A0A]">4-STAGE CHRONOLOGICAL GRAPH</span>
            </div>
            <div className="flex justify-between">
              <span>REMEDIATION</span>
              <span className="text-[#0037FF]">SIMULATED FREEZE & BLOCK ACTIONS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0A0A0A] pt-8 mt-12 flex justify-between items-center">
        <MonoLabel color="muted">PREPARED FOR FUSION INTEGRATION</MonoLabel>
        <ArrowLink to="/dashboard" size="md">
          GO TO DASHBOARD
        </ArrowLink>
      </div>
    </div>
  );
});

FusionEnginePage.displayName = 'FusionEnginePage';
