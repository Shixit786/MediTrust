import React, { useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { ShieldAlert, ShieldCheck, Check, Bell, Copy } from 'lucide-react';
import type { FusionResult } from '../../types/analysis';

interface FusionResponseCardProps {
  fusionResult: FusionResult;
}

export const FusionResponseCard: React.FC<FusionResponseCardProps> = React.memo(
  ({ fusionResult }) => {
    const trustedContactAlerted = useAnalysisStore((s) => s.trustedContactAlerted);
    const setTrustedContactAlerted = useAnalysisStore((s) => s.setTrustedContactAlerted);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const isLow = fusionResult.level === 'low';

    const handleNotifyContact = () => {
      if (!trustedContactAlerted) {
        setTrustedContactAlerted(true);
        setToastMessage('SIMULATION: Emergency alert sent to registered emergency contacts.');
        setTimeout(() => setToastMessage(null), 3500);
      }
    };

    const handleCopyReport = () => {
      const summaryText = `[MEDITRUST FUSION ENGINE REPORT]
VERDICT: ${fusionResult.pattern.toUpperCase()}
OVERALL RISK: ${fusionResult.overall_risk}/100 (${fusionResult.level.toUpperCase()})
EXPLANATION: ${fusionResult.explanation}
RECOMMENDED ACTIONS:
${fusionResult.actions.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
HELPLINE: 1930 (National Cyber Crime Reporting Portal)
NOTE: Early warning assessment, not legal proof.`;

      navigator.clipboard.writeText(summaryText).then(() => {
        setToastMessage('Report summary copied to clipboard.');
        setTimeout(() => setToastMessage(null), 3500);
      }).catch(() => {
        setToastMessage('Report copied.');
        setTimeout(() => setToastMessage(null), 3500);
      });
    };

    return (
      <div className="relative w-full rounded-[20px] bg-[#0A0A0A] text-white p-6 sm:p-10 border border-[#0A0A0A] overflow-hidden flex flex-col gap-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="absolute top-4 right-4 z-20 bg-white text-[#0A0A0A] px-4 py-2.5 rounded-xl border border-[#0A0A0A] shadow-md flex items-center gap-2.5 text-xs font-['Inter_Tight'] font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/15">
          <div className="flex items-center gap-3">
            {isLow ? (
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#0037FF]" />
            )}
            <MonoLabel color="subtle" className="text-xs text-white/70 font-semibold tracking-widest">
              RECOMMENDED RESPONSE // PROTOCOL ACTIONS
            </MonoLabel>
          </div>

          <span className="font-mono-label text-[11px] text-white/50">
            {isLow ? 'MAINTAIN BASELINE SECURITY' : 'COORDINATED DEFENSE DIRECTIVES'}
          </span>
        </div>

        {/* Action Directives List */}
        <div className="space-y-4">
          <MonoLabel color="subtle" className="text-[10px] text-white/50 block">
            DEFENSIVE ACTIONS
          </MonoLabel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fusionResult.actions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-5 h-5 rounded-full bg-[#0037FF]/30 border border-[#0037FF] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-mono-label text-[10px] text-white font-bold">
                    {idx + 1}
                  </span>
                </div>
                <span className="font-['Inter_Tight'] text-sm text-white/90 leading-relaxed font-normal">
                  {action}
                </span>
              </div>
            ))}
          </div>

          {isLow && (
            <p className="font-mono-label text-xs text-white/60 pt-2">
              Low scores do not guarantee safety. Stay alert.
            </p>
          )}
        </div>

        {/* Helpline + Actions Buttons */}
        <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-mono-label text-xs font-bold text-white tracking-wider">
              CYBER CRIME HELPLINE 1930 · cybercrime.gov.in
            </span>
            <p className="font-['Inter_Tight'] text-xs text-white/50">
              Freeze and block actions are simulated in this demo. Real actions need telecom and bank
              integration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono-label text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>COPY REPORT</span>
            </button>

            <button
              type="button"
              onClick={handleNotifyContact}
              className={`px-4 py-2.5 rounded-xl border font-mono-label text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                trustedContactAlerted
                  ? 'bg-[#16A34A]/20 border-[#16A34A]/40 text-[#4ADE80]'
                  : 'bg-[#0037FF] hover:bg-[#0030E0] border-[#0037FF] text-white'
              }`}
            >
              {trustedContactAlerted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>CONTACT ALERTED ✓</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>NOTIFY TRUSTED CONTACT (SIMULATED)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

FusionResponseCard.displayName = 'FusionResponseCard';
