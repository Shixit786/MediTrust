import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { ArrowUpRight, Copy, Check, PhoneCall, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { VoiceShieldResult } from '../../types/analysis';

interface VoiceSafeNextStepProps {
  result: VoiceShieldResult;
}

export const VoiceSafeNextStep: React.FC<VoiceSafeNextStepProps> = React.memo(({ result }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const isHuman = result.level === 'low';

  const steps = isHuman
    ? [
        'Confirm caller identity independently using trusted organizational contacts',
        'Never disclose confidential banking OTPs or passwords over the phone',
        'Ask clarifying clinical questions if conversation involves patient treatments',
        'Remember that a low synthetic score does not guarantee intent is benign',
      ]
    : [
        'Do not share OTP or card details',
        "Hang up and call the hospital's official number",
        'Ask a family member to verify the caller',
        'Report fraudulent phone numbers immediately to National Cyber Crime portal',
      ];

  const handleCopyReport = useCallback(() => {
    const reportText = `[MEDITRUST AI VOICE SHIELD ACOUSTIC FORENSIC DOSSIER]
Synthetic Risk Score: ${result.risk}% (${result.level.toUpperCase()})
Classification: ${result.threat}
Confidence: ${Math.round((result.confidence ?? 0.8) * 100)}%
Duration: ${result.duration_sec}s

Acoustic Vectors Evaluated (9):
${result.features
  .map(
    (f) =>
      `- [${f.id}] ${f.name}: ${f.status.toUpperCase()} (Score: ${f.score.toFixed(2)}) — ${f.note}`
  )
  .join('\n')}

Detected Anomalies:
${
  result.anomalies.length > 0
    ? result.anomalies
        .map(
          (a) =>
            `- [${a.feature} @ ${a.t_start}s-${a.t_end}s]: ${a.reason}`
        )
        .join('\n')
    : '- Zero temporal acoustic anomalies detected'
}

AI Reasoning:
${result.ai.summary_en}

Official Helpline: 1930 (cybercrime.gov.in)
Verified via MediTrust AI Acoustic Threat Intelligence`;

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
            {isHuman ? (
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#3B5BFF]" />
            )}
            <MonoLabel color="accent">
              {isHuman ? 'VERIFIED CALL PROTOCOL' : 'ACTIVE THREAT DIRECTIVE'}
            </MonoLabel>
          </div>
          <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-white">
            {isHuman ? 'Recommended Best Practices' : 'Immediate Protective Action'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-[#3B5BFF]" />
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
            <div className="w-6 h-6 rounded-full bg-[#3B5BFF]/20 text-[#3B5BFF] flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
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
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#3B5BFF] hover:bg-[#2e4be0] text-white font-mono text-xs font-bold tracking-widest transition-transform hover:-translate-y-0.5 active:translate-y-0 group"
        >
          <span>SEND TO FUSION ENGINE</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {isHuman && (
        <div className="mt-6 text-[11px] font-mono text-white/40">
          * A low score does not guarantee a voice is real. Always verify unexpected financial or authorization demands.
        </div>
      )}
    </section>
  );
});

VoiceSafeNextStep.displayName = 'VoiceSafeNextStep';
