import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { ArrowLink } from '../ui/ArrowLink';

interface PlaybookHeaderProps {
  hasResult: boolean;
  onLoadScenario: () => void;
}

export const PlaybookHeader: React.FC<PlaybookHeaderProps> = React.memo(
  ({ hasResult, onLoadScenario }) => {
    return (
      <header className="flex flex-col gap-6 pt-4 pb-8 border-b border-[#0A0A0A]">
        {/* Top category label */}
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
          <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
            RESPONSE PLAYBOOK
          </MonoLabel>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none">
          <RevealText delay={0.05}>Safe next step</RevealText>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed">
          What to do right now, who to tell, and how to report it.
        </p>

        {/* Calm empty state when no result is loaded */}
        {!hasResult && (
          <div className="mt-4 p-6 sm:p-8 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
              <span className="font-['Inter_Tight'] font-medium text-base text-[#0A0A0A]">
                No threat telemetry currently loaded.
              </span>
              <button
                type="button"
                onClick={onLoadScenario}
                className="font-mono-label text-xs font-bold text-[#0037FF] hover:underline text-left cursor-pointer"
              >
                LOAD DEMO SCENARIO ↗
              </button>
            </div>

            <p className="font-['Inter_Tight'] text-sm text-[#6B6F76]">
              You can run an individual vector check first or load our simulated coordinated threat scenario
              to see tailored response actions.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <ArrowLink to="/job" size="sm">
                RUN JOB SHIELD
              </ArrowLink>
              <ArrowLink to="/voice" size="sm">
                RUN VOICE SHIELD
              </ArrowLink>
              <ArrowLink to="/sim" size="sm">
                RUN SIM GUARD
              </ArrowLink>
              <ArrowLink to="/fusion" size="sm">
                OPEN FUSION ENGINE
              </ArrowLink>
            </div>
          </div>
        )}
      </header>
    );
  }
);

PlaybookHeader.displayName = 'PlaybookHeader';
