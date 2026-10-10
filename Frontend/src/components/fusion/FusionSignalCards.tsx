import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { ArrowLink } from '../ui/ArrowLink';
import { MagneticButton } from '../ui/MagneticButton';
import { FUSION_SCENARIOS } from '../../services/mocks/fusionScenarios';
import type { ShieldId } from '../../types/analysis';

interface FusionSignalCardsProps {
  onRunFusion: () => void;
  isLoading: boolean;
}

interface ShieldMeta {
  id: ShieldId;
  name: string;
  dotColor: string;
  route: string;
}

const SHIELDS: ShieldMeta[] = [
  { id: 'job', name: 'job·shield', dotColor: '#F5B800', route: '/job' },
  { id: 'voice', name: 'voice·shield', dotColor: '#3B5BFF', route: '/voice' },
  { id: 'sim', name: 'sim·guard', dotColor: '#FF4FA3', route: '/sim' },
];

export const FusionSignalCards: React.FC<FusionSignalCardsProps> = React.memo(
  ({ onRunFusion, isLoading }) => {
    const shieldResults = useAnalysisStore((s) => s.shieldResults);
    const setShieldResultsMap = useAnalysisStore((s) => s.setShieldResultsMap);
    const clearAllShields = useAnalysisStore((s) => s.clearAllShields);

    const hasAnyResult = Object.values(shieldResults).some((r) => r !== undefined);

    const handleLoadScenario = (scenarioKey: string) => {
      const scenario = FUSION_SCENARIOS[scenarioKey];
      if (scenario) {
        setShieldResultsMap(scenario.results);
      }
    };

    return (
      <div className="flex flex-col gap-8">
        {/* Section Label */}
        <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10">
          <MonoLabel color="muted">INPUT SIGNALS // ACTIVE VECTORS</MonoLabel>
          <span className="font-mono-label text-xs text-[#6B6F76]">
            {hasAnyResult ? 'SIGNALS LOADED' : 'AWAITING TELEMETRY'}
          </span>
        </div>

        {/* 3 Shield Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHIELDS.map((shield) => {
            const result = shieldResults[shield.id];
            const hasResult = !!result;

            return (
              <div
                key={shield.id}
                className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col justify-between min-h-[260px] relative overflow-hidden"
              >
                {/* Header row */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['Inter_Tight'] font-medium text-lg text-[#0A0A0A]">
                      {shield.name}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: shield.dotColor }}
                      aria-label={`${shield.name} accent`}
                    />
                  </div>

                  <MonoLabel
                    color={hasResult ? 'ink' : 'muted'}
                    className="text-[11px] block mb-6 font-semibold"
                  >
                    {hasResult ? 'RESULT READY' : 'NO RESULT YET'}
                  </MonoLabel>

                  {/* Big risk or placeholder */}
                  <div className="flex items-baseline gap-2 mb-2">
                    {hasResult ? (
                      <>
                        <BigNumber value={result.risk} size="giant" animate={false} />
                        <span className="font-mono-label text-xs text-[#6B6F76]">/100 RISK</span>
                      </>
                    ) : (
                      <span className="text-5xl sm:text-6xl font-light font-['Inter_Tight'] text-[#0A0A0A]/20">
                        --
                      </span>
                    )}
                  </div>

                  <p className="font-['Inter_Tight'] text-sm text-[#6B6F76] font-normal truncate">
                    {hasResult ? result.threat : 'Awaiting vector analysis'}
                  </p>
                </div>

                {/* Footer link to individual shield page */}
                <div className="pt-6 border-t border-[#0A0A0A]/10 mt-6 flex justify-between items-center">
                  <span className="font-mono-label text-[10px] text-[#6B6F76]">
                    {hasResult ? `${result.signals.length} SIGNALS` : 'STANDBY'}
                  </span>
                  <ArrowLink to={shield.route} size="sm">
                    {hasResult ? 'VIEW RESULT' : 'RUN THIS SHIELD'}
                  </ArrowLink>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scenario Loading Bar */}
        <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
              <MonoLabel color="ink" className="text-xs font-semibold">
                NO RESULTS? TRY A SCENARIO
              </MonoLabel>
            </div>

            <button
              type="button"
              onClick={clearAllShields}
              className="font-mono-label text-xs text-[#6B6F76] hover:text-[#0A0A0A] underline underline-offset-4 text-left transition-colors cursor-pointer"
            >
              CLEAR ALL
            </button>
          </div>

          {/* 4 Scenario chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(FUSION_SCENARIOS).map(([key, scenario]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleLoadScenario(key)}
                className="group p-3.5 rounded-[14px] bg-[#F0F0F0]/70 hover:bg-[#F0F0F0] border border-[#0A0A0A]/10 hover:border-[#0A0A0A] transition-colors text-left flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono-label text-xs font-bold text-[#0A0A0A]">
                    {scenario.name}
                  </span>
                  <span className="font-mono-label text-[11px] text-[#0037FF] group-hover:translate-x-0.5 transition-transform">
                    LOAD ↗
                  </span>
                </div>
                <span className="font-mono-label text-[10px] text-[#6B6F76]">
                  {scenario.tagline}
                </span>
              </button>
            ))}
          </div>

          {/* Trigger Fusion button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="font-mono-label text-xs text-[#6B6F76]">
              {hasAnyResult
                ? 'Ready to correlate active threat vectors.'
                : 'Select a scenario above or run a shield to begin.'}
            </span>

            <MagneticButton
              variant="primary"
              size="lg"
              disabled={!hasAnyResult || isLoading}
              onClick={onRunFusion}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'CORRELATING SIGNALS...' : 'RUN FUSION ENGINE'}
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }
);

FusionSignalCards.displayName = 'FusionSignalCards';
