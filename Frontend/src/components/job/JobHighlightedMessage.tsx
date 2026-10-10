import React, { useMemo } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { parseHighlightedText, CATEGORY_COLORS } from '../../utils/jobHighlighter';

interface JobHighlightedMessageProps {
  text: string;
}

const LEGEND_ITEMS: Array<{
  category: 'URGENCY' | 'UPFRONT PAYMENT' | 'OTP REQUEST' | 'UNREALISTIC SALARY' | 'SUSPICIOUS LINK' | 'PERSONAL DATA';
  label: string;
}> = [
  { category: 'URGENCY', label: 'URGENCY' },
  { category: 'UPFRONT PAYMENT', label: 'UPFRONT PAYMENT' },
  { category: 'OTP REQUEST', label: 'OTP REQUEST' },
  { category: 'UNREALISTIC SALARY', label: 'UNREALISTIC SALARY' },
  { category: 'SUSPICIOUS LINK', label: 'SUSPICIOUS LINK' },
  { category: 'PERSONAL DATA', label: 'PERSONAL DATA REQUEST' },
];

export const JobHighlightedMessage: React.FC<JobHighlightedMessageProps> = React.memo(({ text }) => {
  const segments = useMemo(() => parseHighlightedText(text), [text]);

  return (
    <section
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
      aria-label="Highlighted Forensic Analysis of Message"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
        <div>
          <MonoLabel color="accent">WHY WE FLAGGED IT</MonoLabel>
          <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
            Forensic Text Highlighting
          </h3>
        </div>
        <div className="font-mono-label text-xs text-[#6B6F76]">
          HOVER OR TAP HIGHLIGHTS FOR THREAT DETAIL
        </div>
      </div>

      {/* Message Text Card */}
      <div className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 font-mono text-xs sm:text-sm leading-relaxed text-[#0A0A0A] whitespace-pre-wrap selection:bg-[#F5B800]/30 overflow-x-auto">
        {segments.map((seg, idx) => {
          if (!seg.isHighlight || !seg.category) {
            return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
          }

          const colors = CATEGORY_COLORS[seg.category] || {
            bg: 'rgba(245, 184, 0, 0.2)',
            text: '#0A0A0A',
            border: '#F5B800',
          };

          return (
            <mark
              key={idx}
              tabIndex={0}
              className="relative group inline cursor-help rounded px-1.5 py-0.5 mx-0.5 transition-colors border-b-2"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                borderBottomColor: colors.border,
              }}
            >
              <span className="font-semibold">{seg.text}</span>

              {/* Pure CSS Tooltip (Zero React state updates on hover) */}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus:flex flex-col z-30 min-w-[220px] max-w-[280px] p-2.5 rounded-lg bg-[#0A0A0A] text-white text-[11px] font-sans leading-tight shadow-xl"
              >
                <span className="font-mono-label text-[10px] text-[#F5B800] uppercase mb-1">
                  {seg.category}
                </span>
                <span className="text-[#E0E0E0]">{seg.reason}</span>
                {/* Tooltip caret */}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0A0A0A]" />
              </span>
            </mark>
          );
        })}
      </div>

      {/* Category Chips Legend */}
      <div className="mt-6 pt-6 border-t border-[#0A0A0A]/10">
        <div className="text-[11px] font-mono-label text-[#6B6F76] uppercase tracking-wider mb-3">
          THREAT CATEGORY LEGEND:
        </div>
        <div className="flex flex-wrap gap-2">
          {LEGEND_ITEMS.map((item) => {
            const colors = CATEGORY_COLORS[item.category];
            return (
              <span
                key={item.category}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colors.text }}
                />
                {item.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
});

JobHighlightedMessage.displayName = 'JobHighlightedMessage';
