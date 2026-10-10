import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import type { FusionContribution, ShieldId } from '../../types/analysis';

interface FusionContributionsProps {
  contributions: FusionContribution[];
}

const SHIELD_COLORS: Record<ShieldId, string> = {
  job: '#F5B800',
  voice: '#3B5BFF',
  sim: '#FF4FA3',
};

export const FusionContributions: React.FC<FusionContributionsProps> = React.memo(
  ({ contributions }) => {
    return (
      <div className="flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10">
          <MonoLabel color="muted">SHIELD CONTRIBUTION // VECTOR WEIGHTS</MonoLabel>
          <span className="font-mono-label text-xs text-[#6B6F76]">
            WEIGHT: JOB 35% · VOICE 30% · SIM 35%
          </span>
        </div>

        {/* 3 Hairline Rows */}
        <div className="flex flex-col">
          {contributions.map((item, idx) => {
            const dotColor = SHIELD_COLORS[item.shield] || '#0A0A0A';
            const pct = Math.min(100, Math.max(0, item.risk));
            const isAvailable = item.status !== 'not_available';

            return (
              <HairlineRow
                key={item.shield}
                borderTop={idx === 0}
                borderBottom={true}
                interactive={false}
                className="py-5 px-3 sm:px-4"
              >
                <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Shield wordmark + dot + threat label */}
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                      aria-label={`${item.name} accent`}
                    />
                    <div>
                      <span className="font-['Inter_Tight'] font-medium text-base text-[#0A0A0A] block">
                        {item.name}
                      </span>
                      <span className="font-['Inter_Tight'] text-xs text-[#6B6F76] font-normal truncate block">
                        {isAvailable ? item.threat : 'Vector not available'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Progress bar (scaleX only) */}
                  <div className="flex-1 max-w-md w-full flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full origin-left transition-transform duration-700 ease-out"
                        style={{
                          backgroundColor: dotColor,
                          transform: `scaleX(${isAvailable ? pct / 100 : 0})`,
                        }}
                      />
                    </div>
                    <span className="font-mono-label text-xs font-semibold text-[#0A0A0A] w-12 text-right">
                      {isAvailable ? `${item.risk}` : '--'}
                    </span>
                  </div>

                  {/* Right: Status Chip + Weight */}
                  <div className="flex items-center gap-4 justify-between md:justify-end">
                    <span className="font-mono-label text-[11px] text-[#6B6F76]">
                      WEIGHT {Math.round(item.weight * 100)}%
                    </span>

                    {item.status === 'detected' ? (
                      <span className="px-2.5 py-1 rounded bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-[#E11D2E] font-mono-label text-[10px] font-bold">
                        DETECTED
                      </span>
                    ) : item.status === 'weak_signal' ? (
                      <span className="px-2.5 py-1 rounded bg-[#F5B800]/15 border border-[#F5B800]/30 text-[#B45309] font-mono-label text-[10px] font-bold">
                        WEAK SIGNAL
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-[#0A0A0A]/5 border border-[#0A0A0A]/15 text-[#6B6F76] font-mono-label text-[10px] font-medium">
                        NOT AVAILABLE
                      </span>
                    )}
                  </div>
                </div>
              </HairlineRow>
            );
          })}
        </div>
      </div>
    );
  }
);

FusionContributions.displayName = 'FusionContributions';
