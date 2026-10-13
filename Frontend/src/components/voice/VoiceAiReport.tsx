import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import type { VoiceAiAnalysis } from '../../types/analysis';
import { Sparkles, AlertCircle } from 'lucide-react';

interface VoiceAiReportProps {
  ai: VoiceAiAnalysis;
}

export const VoiceAiReport: React.FC<VoiceAiReportProps> = React.memo(({ ai }) => {
  const summaryText = ai.summary_en;

  return (
    <section
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
      aria-label="AI Forensics Report"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0A0A0A] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#3B5BFF]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#3B5BFF]" />
          </div>
          <div>
            <MonoLabel color="accent">
              {(ai as { provider?: string }).provider === 'template'
                ? 'TEMPLATE EXPLANATION'
                : 'AI EXPLANATION'}
            </MonoLabel>
            <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
              Autonomous Acoustic Dossier
            </h3>
          </div>
        </div>
      </div>

      {/* Reasoning Paragraph revealed line by line */}
      <div className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/40 border border-[#0A0A0A]/10 mb-6">
        <div className="text-base sm:text-lg font-light text-[#0A0A0A] leading-relaxed">
          <RevealText splitBy="lines" duration={0.6}>
            {summaryText}
          </RevealText>
        </div>
      </div>

      {/* WHY THIS MATTERS (Healthcare Scams context) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#3B5BFF]/5 border border-[#3B5BFF]/20 flex items-start gap-3 mb-6">
        <AlertCircle className="w-4 h-4 text-[#3B5BFF] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-[#0A0A0A] leading-relaxed font-light">
          <strong className="font-semibold text-[#3B5BFF]">WHY THIS MATTERS: </strong>
          {ai.why_matters ||
            'Fake doctor and hospital callers use cloned voices to create panic and ask for OTP or advance payment.'}
        </div>
      </div>

      {/* Matched Pattern Chips */}
      {ai.patterns && ai.patterns.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-mono-label text-[#6B6F76] uppercase tracking-wider mb-2.5">
            MATCHED PATTERN VECTORS:
          </div>
          <div className="flex flex-wrap gap-2">
            {ai.patterns.map((pat) => (
              <span
                key={pat}
                className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#0A0A0A] text-white tracking-wide uppercase"
              >
                {pat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Meter (scaleX transform) */}
      <div className="pt-6 border-t border-[#0A0A0A]/10">
        <div className="flex items-center justify-between text-xs font-mono-label mb-2">
          <span className="text-[#6B6F76]">ACOUSTIC FORENSICS CONFIDENCE</span>
          <span className="text-[#0A0A0A] font-bold">
            {Math.round(ai.confidence * 100)}%
          </span>
        </div>
        <div className="w-full bg-[#0A0A0A]/10 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3B5BFF] rounded-full"
            style={{
              transform: `scaleX(${Math.max(0.05, Math.min(1, ai.confidence))})`,
              transformOrigin: 'left',
              transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </section>
  );
});

VoiceAiReport.displayName = 'VoiceAiReport';
