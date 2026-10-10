import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import type { RedFlagItem } from '../../types/analysis';
import { ShieldCheck, Cross } from 'lucide-react';

interface JobRedFlagsListProps {
  redFlags: RedFlagItem[];
}

export const JobRedFlagsList: React.FC<JobRedFlagsListProps> = React.memo(({ redFlags }) => {
  const hasFlags = redFlags && redFlags.length > 0;

  return (
    <section
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
      aria-label="Red Flags Forensic Breakdown"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
        <div>
          <MonoLabel color="accent">FORENSIC PATTERN DETECTION</MonoLabel>
          <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
            Red Flag Indicators ({hasFlags ? redFlags.length : 0})
          </h3>
        </div>
        <div className="font-mono-label text-xs text-[#6B6F76]">
          {hasFlags ? 'IDENTIFIED MALICIOUS SIGNALS' : 'ZERO THREATS IDENTIFIED'}
        </div>
      </div>

      {!hasFlags ? (
        <div className="p-8 rounded-[16px] bg-[#10B981]/5 border border-[#10B981]/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold text-[#059669]">
              CLEAN RECRUITMENT PROFILE
            </div>
            <p className="text-sm text-[#6B6F76] font-light mt-1">
              No advance fee demands, credential harvesting requests, or deceptive urgency patterns detected in the analyzed offer.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {redFlags.map((flag, idx) => (
            <HairlineRow
              key={`${flag.title}-${idx}`}
              borderTop={idx > 0}
              borderBottom={idx < redFlags.length - 1}
              interactive={false}
              className="py-4 sm:py-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20">
                      {flag.category}
                    </span>

                    {flag.healthcare && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-[#F5B800]/15 text-[#B45309] border border-[#F5B800]/30">
                        <Cross className="w-3 h-3 text-[#D97706]" />
                        HEALTHCARE LURE: HOSPITAL / NURSING JOB
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-medium text-[#0A0A0A] font-sans">
                    {flag.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-[#6B6F76] font-light leading-relaxed">
                    {flag.detail}
                  </p>
                </div>
              </div>
            </HairlineRow>
          ))}
        </div>
      )}
    </section>
  );
});

JobRedFlagsList.displayName = 'JobRedFlagsList';
