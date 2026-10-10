import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import type { CompanyAnalysis } from '../../types/analysis';
import { Building2 } from 'lucide-react';

interface JobCompanyVerificationProps {
  company: CompanyAnalysis;
}

export const JobCompanyVerification: React.FC<JobCompanyVerificationProps> = React.memo(
  ({ company }) => {
    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="MCA21 Corporate Registry Verification"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
          <div>
            <MonoLabel color="accent">COMPANY CHECK (MCA21-STYLE LOOKUP)</MonoLabel>
            <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
              Ministry of Corporate Affairs Registry Audit
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#0A0A0A] bg-[#F0F0F0] px-3 py-1.5 rounded-lg border border-[#0A0A0A]/10">
            <Building2 className="w-4 h-4 text-[#F5B800]" />
            <span className="font-semibold">{company.name || 'Unspecified Entity'}</span>
          </div>
        </div>

        {/* 4 Check Rows */}
        <div className="divide-y divide-[#0A0A0A]/10">
          {company.checks.map((check) => {
            const isMatch = check.status === 'match';
            const isMismatch = check.status === 'mismatch';
            const isNotFound = check.status === 'not_found';

            const chipText = isMatch
              ? 'MATCH'
              : isMismatch
              ? 'MISMATCH'
              : isNotFound
              ? 'NOT FOUND'
              : check.status;

            return (
              <div
                key={check.label}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm font-mono"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isMatch ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                    }`}
                  />
                  <span className="text-[#0A0A0A] font-medium tracking-wide">
                    {check.label}
                  </span>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold tracking-widest uppercase ${
                      isMatch
                        ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20'
                        : 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20'
                    }`}
                  >
                    {chipText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Muted note */}
        <div className="mt-6 pt-4 border-t border-[#0A0A0A]/10 text-[11px] font-mono-label text-[#6B6F76]">
          * Demo uses a simulated company registry lookup cross-referencing ROC MCA21 master records and WHOIS registrations.
        </div>
      </section>
    );
  }
);

JobCompanyVerification.displayName = 'JobCompanyVerification';
