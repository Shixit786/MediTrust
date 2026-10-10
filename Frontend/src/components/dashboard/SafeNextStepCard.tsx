import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { ArrowLink } from '../ui/ArrowLink';
import { ShieldAlert, Ban, KeyRound, PhoneCall, Check, Bell } from 'lucide-react';

export const SafeNextStepCard: React.FC = React.memo(() => {
  const trustedContactAlerted = useAnalysisStore((s) => s.trustedContactAlerted);
  const setTrustedContactAlerted = useAnalysisStore((s) => s.setTrustedContactAlerted);
  const [showToast, setShowToast] = useState(false);

  const handleNotifyContact = () => {
    if (!trustedContactAlerted) {
      setTrustedContactAlerted(true);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3500);
    }
  };

  return (
    <div className="relative w-full rounded-[20px] bg-[#0A0A0A] text-white p-6 sm:p-10 border border-[#0A0A0A] overflow-hidden">
      {/* Toast Notification (pure CSS transform + opacity) */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-4 right-4 z-20 bg-white text-[#0A0A0A] px-4 py-2.5 rounded-xl border border-[#0A0A0A] shadow-md flex items-center gap-2.5 text-xs font-['Inter_Tight'] font-semibold"
        >
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          <span>SIMULATION: Emergency SMS broadcast sent to trusted contact.</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#E11D2E]" />
          <MonoLabel color="subtle" className="text-xs text-white/70 font-semibold tracking-widest">
            SAFE NEXT STEP // PROTOCOL RESPONSE
          </MonoLabel>
        </div>

        <span className="font-mono-label text-[11px] text-white/50">
          HEALTHCARE FRAUD DEFENSE
        </span>
      </div>

      {/* 3 Core Action Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-b border-white/15">
        {/* Step 1 */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Ban className="w-4 h-4 text-[#E11D2E]" />
          </div>
          <div>
            <span className="font-mono-label text-[10px] text-white/50 block mb-0.5">
              ACTION 01
            </span>
            <h4 className="font-['Inter_Tight'] font-semibold text-base text-white">
              Do not click the link
            </h4>
            <p className="text-xs text-white/60 mt-1">
              Phishing attachment and harvest portal actively blocked.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div>
            <span className="font-mono-label text-[10px] text-white/50 block mb-0.5">
              ACTION 02
            </span>
            <h4 className="font-['Inter_Tight'] font-semibold text-base text-white">
              Do not share any OTP
            </h4>
            <p className="text-xs text-white/60 mt-1">
              Secondary auth tokens under active SIM interception attempt.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <PhoneCall className="w-4 h-4 text-[#3B5BFF]" />
          </div>
          <div>
            <span className="font-mono-label text-[10px] text-white/50 block mb-0.5">
              ACTION 03
            </span>
            <h4 className="font-['Inter_Tight'] font-semibold text-base text-white">
              Call hospital's official number
            </h4>
            <p className="text-xs text-white/60 mt-1">
              Verify recruitment and HR claims directly via verified landline.
            </p>
          </div>
        </div>
      </div>

      {/* Cyber Helpline Info Bar */}
      <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono-label text-white/70">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#E11D2E]" />
          <span className="font-bold text-white">CYBER CRIME HELPLINE 1930</span>
          <span className="text-white/40 hidden sm:inline">·</span>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6FA3FF] hover:underline"
          >
            cybercrime.gov.in
          </a>
        </div>

        <span className="text-white/40 text-[11px]">
          Freeze and block actions are simulated in this demo.
        </span>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleNotifyContact}
          className={`px-6 py-3.5 rounded-[16px] font-['Inter_Tight'] text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white ${
            trustedContactAlerted
              ? 'bg-[#16A34A] text-white'
              : 'bg-white text-[#0A0A0A] hover:bg-[#E5E5E5]'
          }`}
        >
          {trustedContactAlerted ? (
            <>
              <Check className="w-4 h-4" />
              <span>CONTACT ALERTED ✓</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>NOTIFY TRUSTED CONTACT (SIMULATED)</span>
            </>
          )}
        </button>

        <ArrowLink to="/playbook" size="md" className="text-white hover:text-[#6FA3FF]">
          VIEW PLAYBOOK
        </ArrowLink>
      </div>
    </div>
  );
});

SafeNextStepCard.displayName = 'SafeNextStepCard';
