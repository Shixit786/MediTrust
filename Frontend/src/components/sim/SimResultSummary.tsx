import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { HairlineRow } from '../ui/HairlineRow';
import { RevealText } from '../ui/RevealText';
import type { SimGuardStatus, SimRedFlag } from '../../types/analysis';
import {
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Copy,
  Check,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface SimResultSummaryProps {
  score: number;
  status: SimGuardStatus;
  redFlags: SimRedFlag[];
  maskedNumber: string;
}

export const SimResultSummary: React.FC<SimResultSummaryProps> = React.memo(
  ({ score, status, redFlags, maskedNumber }) => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const isConfirmed = status === 'confirmed' || status === 'frozen';
    const effectiveRisk = isConfirmed ? 95 : score;

    const levelBadge = isConfirmed
      ? { label: 'CRITICAL RISK', bg: 'bg-[#EF4444]/10', text: 'text-[#DC2626]', border: 'border-[#EF4444]/30' }
      : { label: 'ELEVATED ANOMALY', bg: 'bg-[#F59E0B]/10', text: 'text-[#D97706]', border: 'border-[#F59E0B]/30' };

    const verdictText = isConfirmed
      ? 'Critical risk: location jump, new device and OTP flood together match a simulated SIM swap pattern.'
      : 'Suspicious telemetry: isolated carrier telemetry anomalies exceed normal operational tolerance.';

    const summaryText = isConfirmed
      ? 'Multi-vector telemetry correlation confirms unauthorized SIM circuit migration. Cell tower handoff across 900+ km within 11 minutes alongside rapid 2FA token polling indicates coordinated account takeover attempt.'
      : 'Unusual signaling parameters detected on carrier radio network. Monitor outbound verification SMS and ensure bank accounts are guarded with hardware security keys.';

    const actionSteps = [
      'Call your carrier from another phone to verify SIM status',
      'Inform your bank and temporarily block linked debit cards',
      'Change primary email passwords and enable app-based 2FA (Authenticator)',
      'Report unauthorized SIM swaps to National Cyber Crime reporting portal',
    ];

    const handleCopyReport = useCallback(() => {
      const reportText = `[MEDITRUST AI SIM GUARD FORENSIC REPORT]
Target Number: ${maskedNumber}
SIM Swap Risk: ${effectiveRisk}% (${status.toUpperCase()})
Classification: ${isConfirmed ? 'SIM SWAP CONFIRMED (SIMULATED)' : 'ANOMALY DETECTED'}

Red Flags Detected:
${redFlags.map((rf) => `- [${rf.category}] ${rf.title}: ${rf.detail}`).join('\n')}

AI Forensics Summary:
${summaryText}

Official Helpline: 1930 (cybercrime.gov.in)
Verified via MediTrust AI Telecom Identity Defense`;

      navigator.clipboard.writeText(reportText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }, [maskedNumber, effectiveRisk, status, isConfirmed, redFlags, summaryText]);

    const handleSendToFusion = useCallback(() => {
      navigate('/dashboard');
    }, [navigate]);

    return (
      <div className="w-full space-y-8 animate-fade-in" aria-live="polite">
        {/* 1. Verdict Card */}
        <section
          className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12"
          aria-label="SIM Risk Verdict"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-[#0A0A0A]">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <MonoLabel color="accent">SIM RISK</MonoLabel>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${levelBadge.bg} ${levelBadge.text} ${levelBadge.border}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {isConfirmed ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{levelBadge.label}</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <BigNumber
                  value={effectiveRisk}
                  suffix="%"
                  size="giant"
                  animate={true}
                  className="text-[#0A0A0A]"
                />
              </div>
            </div>

            <div className="font-mono-label text-xs text-[#6B6F76] md:text-right">
              TELEMETRY SIGNALS: {redFlags.length} RED FLAGS IDENTIFIED
            </div>
          </div>

          <div className="pt-6">
            <p className="text-base sm:text-lg md:text-xl font-light text-[#0A0A0A] leading-relaxed">
              {verdictText}
            </p>
          </div>
        </section>

        {/* 2. Red Flag List */}
        {redFlags.length > 0 && (
          <section
            className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12"
            aria-label="Telecom Red Flags"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-4">
              <div>
                <MonoLabel color="accent">TELEMETRY ANOMALIES</MonoLabel>
                <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
                  Identified Red Flag Patterns ({redFlags.length})
                </h3>
              </div>
              <div className="font-mono-label text-xs text-[#6B6F76]">
                TIMELINE CORRELATION
              </div>
            </div>

            <div className="divide-y divide-[#0A0A0A]/10">
              {redFlags.map((flag, idx) => (
                <HairlineRow
                  key={`${flag.title}-${idx}`}
                  borderTop={false}
                  borderBottom={false}
                  interactive={false}
                  className="py-4 px-1"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <span className="px-2 py-0.5 self-start rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20">
                      {flag.category}
                    </span>
                    <h4 className="text-sm sm:text-base font-medium text-[#0A0A0A] font-sans mt-1">
                      {flag.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#6B6F76] font-light leading-relaxed">
                      {flag.detail}
                    </p>
                  </div>
                </HairlineRow>
              ))}
            </div>
          </section>
        )}

        {/* 3. AI Explanation Card */}
        <section
          className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12"
          aria-label="AI Forensics Report"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0A0A0A] mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF4FA3]/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#FF4FA3]" />
              </div>
              <div>
                <MonoLabel color="accent">AI FORENSICS REPORT</MonoLabel>
                <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
                  Autonomous Telecom Threat Synthesis
                </h3>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/40 border border-[#0A0A0A]/10">
            <div className="text-base sm:text-lg font-light text-[#0A0A0A] leading-relaxed">
              <RevealText splitBy="lines" duration={0.6}>
                {summaryText}
              </RevealText>
            </div>
          </div>
        </section>

        {/* 4. Safe Next Step Black Card */}
        <section
          className="w-full bg-[#0A0A0A] text-white rounded-[20px] p-6 sm:p-10 md:p-12 relative overflow-hidden"
          aria-label="Safe Next Steps and Action Plan"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-white/10 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-[#FF4FA3]" />
                <MonoLabel color="accent">INCIDENT RESPONSE DIRECTIVE</MonoLabel>
              </div>
              <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-white">
                Immediate Protective Actions
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#FF4FA3]" />
              <span className="font-mono text-xs text-white/80 tracking-wider">
                CYBER CRIME HELPLINE 1930 · cybercrime.gov.in
              </span>
            </div>
          </div>

          {/* Action Steps Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {actionSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-6 h-6 rounded-full bg-[#FF4FA3]/20 text-[#FF4FA3] flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
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

              {copied && (
                <span className="text-xs font-mono text-[#10B981] animate-fade-in" role="status">
                  Forensic summary copied to clipboard
                </span>
              )}
            </div>

            <button
              onClick={handleSendToFusion}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#FF4FA3] hover:bg-[#ff3b99] text-[#0A0A0A] font-mono text-xs font-bold tracking-widest transition-transform hover:-translate-y-0.5 active:translate-y-0 group"
            >
              <span>SEND TO FUSION ENGINE</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </section>
      </div>
    );
  }
);

SimResultSummary.displayName = 'SimResultSummary';
