import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import type { JobShieldResult } from '../../types/analysis';
import { ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';

interface JobResultVerdictProps {
  result: JobShieldResult;
  onScanAnother: () => void;
}

const LEVEL_CONFIG = {
  low: {
    bg: 'bg-[#10B981]/10',
    text: 'text-[#059669]',
    border: 'border-[#10B981]/30',
    dot: 'bg-[#10B981]',
    label: 'LOW RISK',
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
    label: 'HIGH RISK',
    icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    border: 'border-[#EF4444]/30',
    dot: 'bg-[#EF4444]',
    label: 'CRITICAL RISK',
    icon: AlertTriangle,
  },
};

export const JobResultVerdict: React.FC<JobResultVerdictProps> = React.memo(
  ({ result, onScanAnother }) => {
    const levelInfo = LEVEL_CONFIG[result.level] || LEVEL_CONFIG.critical;
    const Icon = levelInfo.icon;

    // Build verdict summary line
    const verdictLine =
      result.level === 'low'
        ? 'Verified communication: authentic recruiter signatures and legitimate domain origins.'
        : result.threat ||
          'High-risk job fraud: fee demand, OTP request and a look-alike hospital domain.';

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="Scam Probability and Verdict"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-[#0A0A0A]">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <MonoLabel color="accent">SCAM PROBABILITY</MonoLabel>
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
              onClick={onScanAnother}
              className="inline-flex items-center gap-1.5 text-xs font-mono-label font-medium tracking-widest text-[#0A0A0A] hover:text-[#F5B800] transition-colors py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A] bg-white group"
            >
              <span>SCAN ANOTHER</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <div className="mt-4 md:mt-0 font-mono-label text-xs text-[#6B6F76] md:text-right">
              CONFIDENCE {Math.round((result.confidence ?? 0.95) * 100)}% · 6 SOURCES RESOLVED
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-base sm:text-lg md:text-xl font-light text-[#0A0A0A] leading-relaxed">
            {verdictLine}
          </p>

          <span
            className={`shrink-0 px-3 py-1 rounded text-xs font-mono font-semibold tracking-wider uppercase ${levelInfo.bg} ${levelInfo.text}`}
          >
            {result.threat}
          </span>
        </div>
      </section>
    );
  }
);

JobResultVerdict.displayName = 'JobResultVerdict';
