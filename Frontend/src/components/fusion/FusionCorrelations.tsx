import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import type { FusionCorrelation } from '../../types/analysis';

interface FusionCorrelationsProps {
  correlations: FusionCorrelation[];
}

export const FusionCorrelations: React.FC<FusionCorrelationsProps> = React.memo(
  ({ correlations }) => {
    const matched = correlations.filter((c) => c.matched);

    return (
      <div className="flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10">
          <MonoLabel color="muted">WHY THESE SIGNALS ARE CONNECTED // CROSS-VECTOR LINKAGES</MonoLabel>
          <span className="font-mono-label text-xs text-[#6B6F76]">
            {matched.length > 0 ? `${matched.length} PATTERNS LINKED` : 'INDEPENDENT SIGNALS'}
          </span>
        </div>

        {matched.length === 0 ? (
          <div className="py-8 px-6 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="font-mono-label text-xs font-semibold text-[#0A0A0A]">
                NO CORRELATION FOUND: SIGNALS LOOK INDEPENDENT
              </span>
            </div>
            <p className="font-['Inter_Tight'] text-xs text-[#6B6F76] font-normal">
              Evaluated telemetry vectors do not exhibit common phishing lures, overlapping attack
              windows, or coordinated OTP exploitation patterns.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {matched.map((corr, idx) => (
              <HairlineRow
                key={corr.id}
                borderTop={idx === 0}
                borderBottom={true}
                interactive={false}
                className="py-5 px-3 sm:px-4"
              >
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Chip with Title */}
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#0037FF]/10 border border-[#0037FF]/30 text-[#0037FF] font-mono-label text-xs font-bold tracking-wider shrink-0">
                      {corr.title}
                    </span>
                    <span className="font-['Inter_Tight'] text-sm sm:text-base text-[#0A0A0A] font-medium">
                      {corr.description}
                    </span>
                  </div>

                  {/* Right: Connected shields indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-label text-[10px] text-[#6B6F76]">
                      VECTORS: {corr.shields.join(' + ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </HairlineRow>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FusionCorrelations.displayName = 'FusionCorrelations';
