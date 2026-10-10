import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { ArrowUpRight, Copy, Check, PhoneCall, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { JobShieldResult } from '../../types/analysis';

interface JobSafeNextStepProps {
  result: JobShieldResult;
}

export const JobSafeNextStep: React.FC<JobSafeNextStepProps> = React.memo(({ result }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const isSafe = result.level === 'low';

  const steps = isSafe
    ? [
        'Verify recruiter identity independently on official hospital/company website',
        'Confirm interview appointment details via corporate email domain',
        'Never disclose private banking OTPs or passwords at any interview stage',
        'Retain documentation of all official employer correspondence',
      ]
    : [
        'Do not pay anything',
        'Do not click the link',
        'Do not share OTP or Aadhaar',
        "Verify on the hospital's official website or phone number",
      ];

  const handleCopyReport = useCallback(() => {
    const reportText = `[MEDITRUST AI JOB SHIELD FORENSIC REPORT]
Threat Level: ${result.level.toUpperCase()} (${result.risk}% Scam Probability)
Classification: ${result.threat}
Extracted Text:
${result.extracted_text}

Key Red Flags:
${
  result.red_flags.length > 0
    ? result.red_flags.map((rf) => `- [${rf.category}] ${rf.title}: ${rf.detail}`).join('\n')
    : '- Zero malicious red flags identified'
}

MCA21 Company Check: ${result.company.name}
${result.company.checks.map((c) => `- ${c.label}: ${c.status.toUpperCase()}`).join('\n')}

AI Forensics Summary:
${result.ai.summary_en}

Official Helpline: 1930 (cybercrime.gov.in)
Verified via MediTrust AI Fraud Forensics Engine`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  }, [result]);

  const handleSendToFusion = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <section
      className="w-full bg-[#0A0A0A] text-white rounded-[20px] p-6 sm:p-10 md:p-12 mb-16 relative overflow-hidden"
      aria-label="Safe Next Steps and Action Plan"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isSafe ? (
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#F5B800]" />
            )}
            <MonoLabel color="accent">
              {isSafe ? 'VERIFIED WORKFLOW' : 'INCIDENT RESPONSE DIRECTIVE'}
            </MonoLabel>
          </div>
          <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-white">
            {isSafe ? 'Recommended Next Steps' : 'Immediate Protective Action'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-[#F5B800]" />
          <span className="font-mono text-xs text-white/80 tracking-wider">
            CYBER CRIME HELPLINE 1930 · cybercrime.gov.in
          </span>
        </div>
      </div>

      {/* Action Steps Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="w-6 h-6 rounded-full bg-[#F5B800]/20 text-[#F5B800] flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <p className="text-sm sm:text-base font-light text-white/90 leading-snug">
              {step}
            </p>
          </div>
        ))}
      </div>

      {/* Button Row and Toast */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* COPY REPORT Button */}
          <button
            onClick={handleCopyReport}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold tracking-wider transition-colors border border-white/10 active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#10B981]">REPORT COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>COPY REPORT</span>
              </>
            )}
          </button>

          {/* Toast feedback */}
          {copied && (
            <span
              className="text-xs font-mono text-[#10B981] animate-fade-in"
              role="status"
            >
              Plain-text forensic summary copied to clipboard
            </span>
          )}
        </div>

        {/* SEND TO FUSION ENGINE ↗ */}
        <button
          onClick={handleSendToFusion}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F5B800] hover:bg-[#e0a800] text-[#0A0A0A] font-mono text-xs font-bold tracking-widest transition-transform hover:-translate-y-0.5 active:translate-y-0 group"
        >
          <span>SEND TO FUSION ENGINE</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {isSafe && (
        <div className="mt-6 text-[11px] font-mono text-white/40">
          * Always verify recruiters independently even when communications appear legitimate.
        </div>
      )}
    </section>
  );
});

JobSafeNextStep.displayName = 'JobSafeNextStep';
