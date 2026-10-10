import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { ArrowLink } from '../ui/ArrowLink';
import { USE_MOCK } from '../../services/api';

interface FusionHeaderProps {
  showBackToDashboard?: boolean;
}

export const FusionHeader: React.FC<FusionHeaderProps> = React.memo(({ showBackToDashboard = true }) => {
  return (
    <header className="flex flex-col gap-6 pt-4 pb-8 border-b border-[#0A0A0A]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Shield Identity & Category */}
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
          <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
            THE INTEGRATION LAYER
          </MonoLabel>

          {USE_MOCK && (
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full border border-[#0037FF]/30 bg-[#0037FF]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0037FF]" />
              <MonoLabel color="accent" className="text-[10px] font-semibold tracking-wider">
                DEMO DATA
              </MonoLabel>
            </div>
          )}
        </div>

        {/* Back Link */}
        {showBackToDashboard && (
          <ArrowLink to="/dashboard" size="sm">
            BACK TO DASHBOARD
          </ArrowLink>
        )}
      </div>

      {/* Main Title */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none">
        <RevealText delay={0.05}>Fusion Engine</RevealText>
      </h1>

      {/* Editorial Subtitle */}
      <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-3xl leading-relaxed">
        Three signals become one picture. We connect the job offer, the voice and the SIM activity to see
        whether they form one coordinated attack.
      </p>
    </header>
  );
});

FusionHeader.displayName = 'FusionHeader';
