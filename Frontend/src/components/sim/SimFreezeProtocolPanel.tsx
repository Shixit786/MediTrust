import React, { useEffect, useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { Lock, Check, Unlock, UserCheck, ShieldAlert } from 'lucide-react';

interface SimFreezeProtocolPanelProps {
  trustedContactAlerted: boolean;
  onReleaseFreeze: () => void;
  onNotifyTrustedContact: () => void;
}

const FREEZE_STEPS = [
  'LOCK OUTGOING OTP DELIVERY',
  'SUSPEND NEW SESSIONS',
  'ALERT ACCOUNT OWNER',
  'NOTIFY TRUSTED CONTACT',
];

export const SimFreezeProtocolPanel: React.FC<SimFreezeProtocolPanelProps> = React.memo(
  ({ trustedContactAlerted, onReleaseFreeze, onNotifyTrustedContact }) => {
    // 4 Steps completion animation (~600ms apart)
    const [completedSteps, setCompletedSteps] = useState<number>(0);
    const [showContactToast, setShowContactToast] = useState(false);

    useEffect(() => {
      const t1 = setTimeout(() => setCompletedSteps(1), 600);
      const t2 = setTimeout(() => setCompletedSteps(2), 1200);
      const t3 = setTimeout(() => setCompletedSteps(3), 1800);
      const t4 = setTimeout(() => setCompletedSteps(4), 2400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }, []);

    const handleNotifyClick = () => {
      onNotifyTrustedContact();
      setShowContactToast(true);
      setTimeout(() => setShowContactToast(false), 3000);
    };

    return (
      <section
        className="w-full bg-[#0A0A0A] text-white rounded-[20px] p-6 sm:p-10 md:p-12 mb-8 relative overflow-hidden"
        aria-label="Freeze Protocol Actions"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-[#FF4FA3]" />
              <MonoLabel color="accent">FREEZE PROTOCOL (SIMULATED)</MonoLabel>
            </div>
            <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-white">
              Account Lockdown Engaged
            </h3>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 self-start sm:self-auto">
            <ShieldAlert className="w-4 h-4 text-[#FF4FA3]" />
            <span className="font-mono text-xs text-white tracking-wider">
              CARRIER GATING ACTIVE
            </span>
          </div>
        </div>

        {/* 4 Lockdown Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {FREEZE_STEPS.map((step, idx) => {
            const isDone = completedSteps > idx;

            return (
              <div
                key={step}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white/50">0{idx + 1}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${isDone
                        ? 'bg-[#10B981] text-white'
                        : 'border border-white/20 text-white/40'
                      }`}
                  >
                    {isDone ? <Check className="w-3 h-3 stroke-[2.5]" /> : ''}
                  </div>
                </div>

                <span
                  className={`font-mono text-xs tracking-wider transition-opacity duration-300 ${isDone ? 'text-white font-bold' : 'text-white/40'
                    }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Buttons Row & Toast */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            {/* RELEASE FREEZE Button */}
            <button
              onClick={onReleaseFreeze}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold tracking-wider transition-colors border border-white/10 active:scale-[0.98]"
            >
              <Unlock className="w-4 h-4 text-[#10B981]" />
              <span>RELEASE FREEZE (SIMULATED)</span>
            </button>

            {/* NOTIFY TRUSTED CONTACT Button */}
            <button
              onClick={handleNotifyClick}
              disabled={trustedContactAlerted}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider transition-colors border active:scale-[0.98] ${trustedContactAlerted
                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                  : 'bg-[#FF4FA3] hover:bg-[#ff3b99] text-[#0A0A0A] border-[#FF4FA3]'
                }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {trustedContactAlerted
                  ? 'CONTACT ALERTED ✓'
                  : 'NOTIFY TRUSTED CONTACT (SIMULATED)'}
              </span>
            </button>
          </div>

          {showContactToast && (
            <span className="text-xs font-mono text-[#10B981] animate-fade-in" role="status">
              Encrypted emergency SMS alert dispatched to trusted contact
            </span>
          )}
        </div>

        <div className="mt-6 text-[11px] font-mono text-white/40">
          * Freeze and block actions are simulated in this demo. Real actions need telecom and bank integration.
        </div>
      </section>
    );
  }
);

SimFreezeProtocolPanel.displayName = 'SimFreezeProtocolPanel';
