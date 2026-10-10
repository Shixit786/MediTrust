import React, { useEffect } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import type { RiskLevel, BlobTone } from '../../types/analysis';

interface PlaybookSituationProps {
  score: number;
  level: RiskLevel;
  pattern: string;
  activeShields: { id: string; name: string; dotColor: string }[];
}

const LEVEL_STYLES: Record<
  RiskLevel,
  { bg: string; border: string; text: string; dot: string }
> = {
  critical: {
    bg: 'bg-[#E11D2E]/10',
    border: 'border-[#E11D2E]/30',
    text: 'text-[#E11D2E]',
    dot: 'bg-[#E11D2E]',
  },
  high: {
    bg: 'bg-[#EA580C]/10',
    border: 'border-[#EA580C]/30',
    text: 'text-[#EA580C]',
    dot: 'bg-[#EA580C]',
  },
  medium: {
    bg: 'bg-[#F5B800]/15',
    border: 'border-[#F5B800]/40',
    text: 'text-[#B45309]',
    dot: 'bg-[#F5B800]',
  },
  low: {
    bg: 'bg-[#16A34A]/10',
    border: 'border-[#16A34A]/30',
    text: 'text-[#16A34A]',
    dot: 'bg-[#16A34A]',
  },
};

export const PlaybookSituation: React.FC<PlaybookSituationProps> = React.memo(
  ({ score, level, pattern, activeShields }) => {
    const setBlobTone = useAnalysisStore((s) => s.setBlobTone);

    useEffect(() => {
      const toneMap: Record<RiskLevel, BlobTone> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      setBlobTone(toneMap[level] || 'idle');
    }, [level, setBlobTone]);

    const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.low;

    return (
      <section
        aria-label="Current Threat Situation"
        className="p-6 sm:p-10 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
              CURRENT SITUATION
            </MonoLabel>
          </div>

          <span className="font-mono-label text-xs text-[#6B6F76]">
            EARLY WARNING, NOT PROOF
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          {/* Risk score */}
          <div className="flex flex-col gap-2">
            <MonoLabel color="muted" className="text-[11px] block">
              AGGREGATE THREAT INDEX
            </MonoLabel>
            <div className="flex items-baseline gap-2">
              <BigNumber value={score} size="giant" animate={true} duration={1.0} />
              <span className="font-mono-label text-base sm:text-lg text-[#6B6F76] font-medium">
                /100
              </span>
            </div>
          </div>

          {/* Badge & Pattern */}
          <div className="flex flex-col items-start md:items-end gap-3 max-w-xl">
            <div
              className={`px-3.5 py-1.5 rounded-md border flex items-center gap-2 ${levelStyle.bg} ${levelStyle.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${levelStyle.dot}`} />
              <span className={`font-mono-label text-xs font-bold tracking-wider ${levelStyle.text}`}>
                {level.toUpperCase()} THREAT LEVEL
              </span>
            </div>

            <h2 className="font-['Inter_Tight'] text-2xl sm:text-3xl font-light text-[#0A0A0A] md:text-right leading-tight">
              {pattern}
            </h2>

            {/* Active shields chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono-label text-[10px] text-[#6B6F76] mr-1">
                EVALUATED VECTORS:
              </span>
              {activeShields.map((s) => (
                <div
                  key={s.id}
                  className="px-2.5 py-1 rounded-md bg-[#F0F0F0] border border-[#0A0A0A]/10 flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.dotColor }}
                  />
                  <span className="font-mono-label text-[10px] font-bold text-[#0A0A0A]">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

PlaybookSituation.displayName = 'PlaybookSituation';
