import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { ArrowLink } from '../ui/ArrowLink';
import { Cpu, ArrowRight } from 'lucide-react';

export const FusionMiniSummary: React.FC = React.memo(() => {
  const fusionResult = useAnalysisStore((s) => s.fusionResult);
  const demoStatus = useAnalysisStore((s) => s.demoStatus);
  const hasResult = !!fusionResult;

  return (
    <div className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A] mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
              FUSION ENGINE
            </MonoLabel>
          </div>
          <span className="font-mono-label text-[11px] text-[#6B6F76]">
            INTELLIGENCE LAYER
          </span>
        </div>

        {!hasResult ? (
          /* Pre-Demo / Standby State */
          <div className="py-8 flex flex-col items-center justify-center text-center">
            {/* 3 Gray Dots */}
            <div className="flex items-center gap-4 mb-6">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0A0A0A]/20" title="Voice Shield Standby" />
              <span className="w-4 h-[1px] bg-[#0A0A0A]/20" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#0A0A0A]/20" title="Job Shield Standby" />
              <span className="w-4 h-[1px] bg-[#0A0A0A]/20" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#0A0A0A]/20" title="SIM Guard Standby" />
            </div>

            <p className="font-['Inter_Tight'] text-sm text-[#6B6F76] font-normal max-w-xs mb-2">
              {demoStatus === 'running'
                ? 'Correlating incoming vector telemetry across shields...'
                : 'Waiting for shield results...'}
            </p>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40">
              {demoStatus === 'running' ? 'SYNTHESIZING ATTACK CHAIN' : 'RUN DEMO TO TRIGGER FUSION'}
            </span>
          </div>
        ) : (
          /* Post-Demo / Active Fusion Verdict State */
          <div className="space-y-6">
            {/* Big Risk Number + Badge */}
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-1.5">
                <BigNumber value={fusionResult.overall_risk} size="giant" animate={true} duration={1.2} />
                <span className="font-mono-label text-xs text-[#6B6F76] font-medium">
                  /100 COMPOSITE RISK
                </span>
              </div>

              <span className="px-3 py-1 rounded-md bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-[#E11D2E] font-mono-label text-xs font-bold tracking-wider">
                {fusionResult.level.toUpperCase()}
              </span>
            </div>

            {/* Pattern Name */}
            <div className="p-4 rounded-[14px] bg-[#F0F0F0] border border-[#0A0A0A]/15">
              <MonoLabel color="muted" className="text-[10px] block mb-1">
                DETECTED PATTERN
              </MonoLabel>
              <h3 className="font-['Inter_Tight'] font-bold text-lg text-[#0A0A0A]">
                {fusionResult.pattern}
              </h3>
            </div>

            {/* Converging 3-Dots Visualization */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#0A0A0A]/10 bg-white">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#3B5BFF]" title="Voice Shield Vector" />
                <span className="w-3 h-3 rounded-full bg-[#F5B800]" title="Job Shield Vector" />
                <span className="w-3 h-3 rounded-full bg-[#FF4FA3]" title="SIM Guard Vector" />
              </div>

              <ArrowRight className="w-4 h-4 text-[#6B6F76]" />

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#0037FF] animate-pulse flex items-center justify-center" />
                <span className="font-mono-label text-[11px] font-semibold text-[#0037FF]">
                  CONVERGED
                </span>
              </div>
            </div>

            {/* Attack Chain Summary Steps */}
            <div className="space-y-1.5">
              <MonoLabel color="muted" className="text-[10px] block">
                CORRELATED ATTACK VECTOR SEQUENCE
              </MonoLabel>
              <div className="grid grid-cols-2 gap-2">
                {fusionResult.attack_chain.map((chain, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-2 rounded bg-[#F0F0F0]/60 border border-[#0A0A0A]/10 flex items-center gap-2 text-xs"
                  >
                    <span className="font-mono-label text-[10px] text-[#0037FF] font-bold">
                      0{cIdx + 1}
                    </span>
                    <span className="font-['Inter_Tight'] font-medium text-[#0A0A0A] truncate">
                      {chain.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-[#0A0A0A]/10 mt-6 flex justify-between items-center">
        <MonoLabel color="muted" className="text-[11px]">
          {hasResult ? 'CROSS-VECTOR CORRELATION READY' : 'CROSS-SIGNAL SYNTHESIS'}
        </MonoLabel>

        {hasResult ? (
          <ArrowLink to="/fusion" size="sm">
            OPEN FUSION REPORT
          </ArrowLink>
        ) : (
          <span className="font-mono-label text-xs text-[#0A0A0A]/30">STANDBY</span>
        )}
      </div>
    </div>
  );
});

FusionMiniSummary.displayName = 'FusionMiniSummary';
