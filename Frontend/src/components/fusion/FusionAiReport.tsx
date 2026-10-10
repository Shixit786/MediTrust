import React, { useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { Sparkles, Globe2 } from 'lucide-react';
import type { FusionResult } from '../../types/analysis';

interface FusionAiReportProps {
  fusionResult: FusionResult;
}

export const FusionAiReport: React.FC<FusionAiReportProps> = React.memo(({ fusionResult }) => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const explanation =
    lang === 'hi'
      ? fusionResult.explanation_hi || fusionResult.explanation
      : fusionResult.explanation_en || fusionResult.explanation;

  const confidencePct = Math.round((fusionResult.confidence || 0.88) * 100);
  const patterns = fusionResult.matched_patterns || ['Multi-Stage Correlated Telemetry'];

  return (
    <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 flex flex-col gap-6">
      {/* Header with Title and Language Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#0037FF]" />
          <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
            AI FUSION REPORT // SYNTHESIS FORENSICS
          </MonoLabel>
        </div>

        {/* English / Hinglish Toggle */}
        <div className="flex items-center gap-2 bg-[#F0F0F0] p-1 rounded-xl border border-[#0A0A0A]/10">
          <Globe2 className="w-3.5 h-3.5 text-[#6B6F76] ml-2" />
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-lg font-mono-label text-xs font-semibold transition-colors cursor-pointer ${
              lang === 'en'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            ENGLISH
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-3 py-1 rounded-lg font-mono-label text-xs font-semibold transition-colors cursor-pointer ${
              lang === 'hi'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            HINGLISH
          </button>
        </div>
      </div>

      {/* Reasoning Paragraph revealed line by line */}
      <div className="py-2">
        <p className="font-['Inter_Tight'] text-lg sm:text-xl text-[#0A0A0A] font-light leading-relaxed">
          <RevealText key={lang} delay={0.02}>
            {explanation}
          </RevealText>
        </p>
      </div>

      {/* Matched Pattern Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="font-mono-label text-[10px] text-[#6B6F76] mr-2">
          CORRELATED ATTRIBUTES:
        </span>
        {patterns.map((p, idx) => (
          <span
            key={idx}
            className="px-2.5 py-1 rounded-md bg-[#F0F0F0] border border-[#0A0A0A]/10 font-mono-label text-[11px] font-semibold text-[#0A0A0A]"
          >
            {p}
          </span>
        ))}
      </div>

      {/* Confidence Meter (scaleX only) */}
      <div className="pt-4 border-t border-[#0A0A0A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono-label text-xs text-[#6B6F76]">
            MODEL CONFIDENCE METRIC:
          </span>
          <span className="font-mono-label text-xs font-bold text-[#0A0A0A]">
            {confidencePct}%
          </span>
        </div>

        <div className="w-full sm:w-48 h-1.5 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0037FF] origin-left transition-transform duration-700 ease-out"
            style={{ transform: `scaleX(${confidencePct / 100})` }}
          />
        </div>
      </div>
    </div>
  );
});

FusionAiReport.displayName = 'FusionAiReport';
