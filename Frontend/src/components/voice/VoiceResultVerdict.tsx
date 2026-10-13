import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import type { VoiceShieldResult } from '../../types/analysis';
import { ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';

interface VoiceResultVerdictProps {
  result: VoiceShieldResult;
  onAnalyzeAnother: () => void;
}

const LEVEL_CONFIG = {
  low: {
    bg: 'bg-[#10B981]/10',
    text: 'text-[#059669]',
    border: 'border-[#10B981]/30',
    dot: 'bg-[#10B981]',
    label: 'LOW SYNTHETIC RISK',
    icon: ShieldCheck,
  },
  medium: {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#D97706]',
    border: 'border-[#F59E0B]/30',
    dot: 'bg-[#F59E0B]',
    label: 'MEDIUM RISK',
    icon: AlertTriangle,
  },
  high: {
    bg: 'bg-[#F97316]/10',
    text: 'text-[#EA580C]',
    border: 'border-[#F97316]/30',
    dot: 'bg-[#F97316]',
    label: 'HIGH SYNTHETIC RISK',
    icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    border: 'border-[#EF4444]/30',
    dot: 'bg-[#EF4444]',
    label: 'CRITICAL SYNTHETIC RISK',
    icon: AlertTriangle,
  },
};

export const VoiceResultVerdict: React.FC<VoiceResultVerdictProps> = React.memo(
  ({ result, onAnalyzeAnother }) => {
    const levelInfo = LEVEL_CONFIG[result.level] || LEVEL_CONFIG.critical;
    const Icon = levelInfo.icon;

    const verdictSentence =
      result.level === 'low'
        ? 'No strong synthetic cues found. Acoustic properties conform to biological speech patterns.'
        : 'High risk: voice shows several cues common in AI-generated speech (cloned vocal tract and unnatural pitch invariance).';

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="Voice Synthetic Probability and Verdict"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-[#0A0A0A]">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <MonoLabel color="accent">SYNTHETIC VOICE RISK</MonoLabel>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${levelInfo.bg} ${levelInfo.text} ${levelInfo.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${levelInfo.dot}`} />
                <Icon className="w-3.5 h-3.5" />
                <span>{levelInfo.label}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <BigNumber
                value={result.risk}
                suffix="%"
                size="giant"
                animate={true}
                className="text-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end justify-between self-stretch">
            <button
              onClick={onAnalyzeAnother}
              className="inline-flex items-center gap-1.5 text-xs font-mono-label font-medium tracking-widest text-[#0A0A0A] hover:text-[#3B5BFF] transition-colors py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A] bg-white group"
            >
              <span>ANALYZE ANOTHER</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-1 font-mono-label text-xs text-[#6B6F76] md:text-right">
              <div>
                CONFIDENCE {Math.round((result.confidence ?? 0.82) * 100)}% · 9 SPECTRAL VECTORS
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0A0A0A]/5 text-[#0A0A0A] border border-[#0A0A0A]/10">
                <span>RELIABILITY:</span>
                <span className="text-[#3B5BFF]">
                  {(result as { reliability?: string }).reliability?.toUpperCase() || 'MEDIUM'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality warnings if returned by backend */}
        {(result as { quality?: { warnings?: string[] } }).quality?.warnings &&
          (result as { quality?: { warnings?: string[] } }).quality!.warnings!.length > 0 && (
            <div className="pt-4 pb-2">
              {(result as { quality?: { warnings?: string[] } }).quality!.warnings!.map((w, i) => (
                <div key={i} className="text-xs font-mono text-[#D97706] bg-[#F59E0B]/10 p-2.5 rounded-lg border border-[#F59E0B]/20 mb-2">
                  * Notice: {w}
                </div>
              ))}
            </div>
          )}

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-base sm:text-lg md:text-xl font-light text-[#0A0A0A] leading-relaxed">
            {verdictSentence}
          </p>

          <span className="shrink-0 font-mono text-[11px] text-[#6B6F76] tracking-wide uppercase">
            * Risk indicator, not proof.
          </span>
        </div>

        {/* Honest note under verdict */}
        <div className="mt-4 pt-3 border-t border-[#0A0A0A]/10 text-xs font-mono text-[#6B6F76]">
          A low score does not guarantee a voice is real. This is a heuristic indicator.
        </div>
      </section>
    );
  }
);

VoiceResultVerdict.displayName = 'VoiceResultVerdict';
