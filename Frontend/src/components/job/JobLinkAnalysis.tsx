import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import type { ExtractedUrlAnalysis } from '../../types/analysis';
import { Link2, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface JobLinkAnalysisProps {
  urls: ExtractedUrlAnalysis[];
}

const VERDICT_CONFIG = {
  clean: {
    bg: 'bg-[#10B981]/10',
    text: 'text-[#059669]',
    border: 'border-[#10B981]/30',
    label: 'CLEAN DESTINATION',
    icon: CheckCircle2,
  },
  suspicious: {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#D97706]',
    border: 'border-[#F59E0B]/30',
    label: 'SUSPICIOUS LINK',
    icon: AlertOctagon,
  },
  phishing: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    border: 'border-[#EF4444]/30',
    label: 'PHISHING HOST',
    icon: AlertOctagon,
  },
  malicious: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    border: 'border-[#EF4444]/30',
    label: 'MALICIOUS THREAT',
    icon: AlertOctagon,
  },
};

export const JobLinkAnalysis: React.FC<JobLinkAnalysisProps> = React.memo(({ urls }) => {
  const hasUrls = urls && urls.length > 0;

  return (
    <section
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
      aria-label="Extracted Link Forensics"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
        <div>
          <MonoLabel color="accent">DEEP URL FORENSICS</MonoLabel>
          <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
            Extracted Link Threat Intel ({hasUrls ? urls.length : 0})
          </h3>
        </div>
        <div className="font-mono-label text-xs text-[#6B6F76]">
          CROSS-REFERENCED ACROSS 6 SOURCES
        </div>
      </div>

      {!hasUrls ? (
        <div className="p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 text-center">
          <MonoLabel color="muted">NO EXTERNAL URLS DETECTED IN PARSED TEXT</MonoLabel>
        </div>
      ) : (
        <div className="space-y-6">
          {urls.map((item, idx) => {
            const vConfig = VERDICT_CONFIG[item.verdict] || VERDICT_CONFIG.phishing;
            const VIcon = vConfig.icon;

            return (
              <div
                key={`${item.url}-${idx}`}
                className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/40 border border-[#0A0A0A]/10"
              >
                {/* Header with URL and overall verdict */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Link2 className="w-4 h-4 text-[#6B6F76] shrink-0" />
                    <span
                      className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-medium truncate max-w-xs sm:max-w-md md:max-w-lg"
                      title={item.url}
                    >
                      {item.url}
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border shrink-0 ${vConfig.bg} ${vConfig.text} ${vConfig.border}`}
                  >
                    <VIcon className="w-3.5 h-3.5" />
                    <span>{vConfig.label}</span>
                  </div>
                </div>

                {/* Mini 6-source results grid */}
                <div className="mt-5 mb-5">
                  <div className="text-[10px] font-mono-label text-[#6B6F76] uppercase tracking-wider mb-2.5">
                    INTEL FEED CHECKS:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {item.sources.map((src) => {
                      const isClean = src.status === 'clean';
                      const isSuspicious = src.status === 'suspicious';

                      return (
                        <div
                          key={src.name}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#0A0A0A]/5 text-xs font-mono"
                        >
                          <span className="text-[#0A0A0A] text-[11px] font-medium truncate mr-2">
                            {src.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isClean
                                ? 'bg-[#10B981]/10 text-[#059669]'
                                : isSuspicious
                                ? 'bg-[#F59E0B]/10 text-[#D97706]'
                                : 'bg-[#EF4444]/10 text-[#DC2626]'
                            }`}
                          >
                            {src.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Heuristic reasons */}
                {item.reasons && item.reasons.length > 0 && (
                  <div className="pt-4 border-t border-[#0A0A0A]/10">
                    <div className="text-[10px] font-mono-label text-[#6B6F76] uppercase tracking-wider mb-2">
                      HEURISTIC SIGNALS IDENTIFIED:
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-[#6B6F76] font-light">
                      {item.reasons.map((reason, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});

JobLinkAnalysis.displayName = 'JobLinkAnalysis';
