import React, { useEffect } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import type { FusionResult, RiskLevel, BlobTone } from '../../types/analysis';

interface FusionVerdictCardProps {
  fusionResult: FusionResult;
  onRunAgain: () => void;
  onClearAll: () => void;
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

export const FusionVerdictCard: React.FC<FusionVerdictCardProps> = React.memo(
  ({ fusionResult, onRunAgain, onClearAll }) => {
    const setBlobTone = useAnalysisStore((s) => s.setBlobTone);

    // Sync GradientBlob tone with risk verdict
    useEffect(() => {
      const toneMap: Record<RiskLevel, BlobTone> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      setBlobTone(toneMap[fusionResult.level] || 'idle');
    }, [fusionResult.level, setBlobTone]);

    const levelStyle = LEVEL_STYLES[fusionResult.level] || LEVEL_STYLES.low;

    return (
      <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 flex flex-col gap-8">
        {/* Top Header Row with Action Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
              OVERALL RISK VERDICT
            </MonoLabel>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onRunAgain}
              className="font-mono-label text-xs text-[#0037FF] hover:underline cursor-pointer"
            >
              RUN AGAIN ↗
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="font-mono-label text-xs text-[#6B6F76] hover:text-[#0A0A0A] hover:underline cursor-pointer"
            >
              CLEAR ALL
            </button>
          </div>
        </div>

        {/* Main Verdict Row: Giant Number + Badge + Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-2">
            <MonoLabel color="muted" className="text-[11px] block">
              COMPOSITE ATTACK INDEX
            </MonoLabel>

            <div className="flex items-baseline gap-2">
              <BigNumber
                value={fusionResult.overall_risk}
                size="giant"
                animate={true}
                duration={1.2}
              />
              <span className="font-mono-label text-base sm:text-lg text-[#6B6F76] font-medium">
                /100
              </span>
            </div>
          </div>

          {/* Level Badge + Pattern Title */}
          <div className="flex flex-col items-start md:items-end gap-3 max-w-xl">
            <div
              className={`px-3.5 py-1.5 rounded-md border flex items-center gap-2 ${levelStyle.bg} ${levelStyle.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${levelStyle.dot}`} />
              <span className={`font-mono-label text-xs font-bold tracking-wider ${levelStyle.text}`}>
                {fusionResult.level.toUpperCase()} RISK LEVEL
              </span>
            </div>

            <h2 className="font-['Inter_Tight'] text-2xl sm:text-3xl md:text-4xl font-light text-[#0A0A0A] md:text-right leading-tight">
              {fusionResult.pattern}
            </h2>

            <p className="font-mono-label text-xs text-[#6B6F76] md:text-right">
              EARLY WARNING, NOT PROOF
            </p>
          </div>
        </div>
      </div>
    );
  }
);

FusionVerdictCard.displayName = 'FusionVerdictCard';
