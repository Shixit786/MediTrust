import React, { useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import type { VoiceFeature } from '../../types/analysis';
import { ChevronDown } from 'lucide-react';

interface VoiceFeaturesTableProps {
  features: VoiceFeature[];
}

export const VoiceFeaturesTable: React.FC<VoiceFeaturesTableProps> = React.memo(({ features }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
      aria-label="Nine Acoustic Spectral Features"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-4">
        <div>
          <MonoLabel color="accent">SPECTRAL FEATURE MATRIX</MonoLabel>
          <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
            Nine Acoustic Vectors Breakdown
          </h3>
        </div>
        <div className="font-mono-label text-xs text-[#6B6F76]">
          CLICK ANY ROW TO EXPAND REASONING
        </div>
      </div>

      <div className="divide-y divide-[#0A0A0A]/10">
        {features.map((feat, idx) => {
          const isExpanded = expandedIndex === idx;
          const isSuspicious = feat.status === 'suspicious';
          const isNormal = feat.status === 'normal';

          const chipClass = isNormal
            ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/20'
            : isSuspicious
            ? 'bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/20'
            : 'bg-[#EF4444]/10 text-[#DC2626] border-[#EF4444]/20';

          const barColor = isNormal ? '#10B981' : isSuspicious ? '#F59E0B' : '#EF4444';

          return (
            <div key={feat.id || idx} className="py-2">
              <HairlineRow
                borderTop={false}
                borderBottom={false}
                interactive={true}
                className="py-3 px-1 group"
                onClick={() => toggleExpand(idx)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                  {/* Left: Index + Name + What it catches */}
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs text-[#3B5BFF] font-bold shrink-0 mt-0.5 sm:mt-0">
                      {feat.id || `0${idx + 1}`}
                    </span>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
                      <span className="font-sans font-medium text-sm text-[#0A0A0A] group-hover:text-[#3B5BFF] transition-colors truncate">
                        {feat.name}
                      </span>
                      <span className="font-mono-label text-[11px] text-[#6B6F76] truncate">
                        — {feat.whatItCatches}
                      </span>
                    </div>
                  </div>

                  {/* Right: Score Bar + Value + Chip + Chevron */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {/* Thin Score Bar (transform scaleX) */}
                    <div className="w-20 sm:w-28 h-1.5 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: barColor,
                          transform: `scaleX(${Math.max(0.05, Math.min(1, feat.score))})`,
                          transformOrigin: 'left',
                          willChange: 'transform',
                        }}
                      />
                    </div>

                    {/* Numeric Value */}
                    <span className="font-mono text-xs text-[#0A0A0A] font-semibold w-8 text-right">
                      {typeof feat.value === 'number' ? feat.value.toFixed(2) : feat.value}
                    </span>

                    {/* Status Chip */}
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shrink-0 ${chipClass}`}
                    >
                      {feat.status}
                    </span>

                    <ChevronDown
                      className={`w-4 h-4 text-[#6B6F76] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </HairlineRow>

              {/* Expandable Explanation Row (CSS grid 0fr -> 1fr animation) */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="p-4 my-1 rounded-xl bg-[#F0F0F0]/60 border border-[#0A0A0A]/10 text-xs sm:text-sm text-[#0A0A0A] font-light leading-relaxed flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BFF] mt-2 shrink-0" />
                    <span>{feat.note}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

VoiceFeaturesTable.displayName = 'VoiceFeaturesTable';
