import React, { useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { MagneticButton } from '../ui/MagneticButton';
import { api } from '../../services/api';
import type { CarrierInfo } from '../../types/analysis';
import { Smartphone, Check, AlertCircle } from 'lucide-react';

interface SimRegisterSectionProps {
  onRegistered: (data: { maskedNumber: string; carrier: CarrierInfo }) => void;
}

const REGISTRATION_STEPS = [
  'CARRIER LOOKUP',
  'BASELINE PROFILE',
  'TELEMETRY LINKED',
];

export const SimRegisterSection: React.FC<SimRegisterSectionProps> = React.memo(
  ({ onRegistered }) => {
    const [rawDigits, setRawDigits] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [activeScanStep, setActiveScanStep] = useState(0);

    const validateDigits = (digits: string): string | null => {
      if (!digits) return 'Please enter a 10-digit mobile number.';
      if (digits.length !== 10) return 'Mobile number must be exactly 10 digits.';
      if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers must begin with 6, 7, 8, or 9.';
      if (!/^\d+$/.test(digits)) return 'Only numbers (0-9) are allowed.';
      return null;
    };

    const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
      setRawDigits(val);
      if (error) setError(null);
    };

    const handleUseDemo = () => {
      setRawDigits('9820144210');
      setError(null);
    };

    const handleRegister = async () => {
      const err = validateDigits(rawDigits);
      if (err) {
        setError(err);
        return;
      }

      setError(null);
      setIsRegistering(true);
      setActiveScanStep(0);

      // Staggered 1.5s scanning steps
      const t1 = window.setTimeout(() => setActiveScanStep(1), 500);
      const t2 = window.setTimeout(() => setActiveScanStep(2), 1000);

      try {
        const carrier = await api.registerNumber(rawDigits);

        window.setTimeout(() => {
          setIsRegistering(false);
          const masked = `+91 ${rawDigits.slice(0, 2)}••• ••${rawDigits.slice(7)}`;
          onRegistered({ maskedNumber: masked, carrier });
        }, 1500);
      } catch (err) {
        clearTimeout(t1);
        clearTimeout(t2);
        setIsRegistering(false);
        setError('Failed to query carrier registry. Please retry.');
        console.error('Registration error:', err);
      }
    };

    const isValid = rawDigits.length === 10 && /^[6-9]/.test(rawDigits);

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-12"
        aria-label="Register Number for SIM Guard"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#FF4FA3]" />
              <MonoLabel color="accent">ENROLLMENT // TELECOM LOOKUP</MonoLabel>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
              Register Mobile Number for Telemetry Tracking
            </h2>
          </div>
          <div className="font-mono-label text-xs text-[#6B6F76]">
            ZERO TELECOM INTERCEPTION · CLIENT-SIDE ENCRYPTED
          </div>
        </div>

        {isRegistering ? (
          /* Short 1.5s scanning moment */
          <div className="py-8 flex flex-col items-center justify-center gap-6" aria-live="polite">
            <div className="flex items-center gap-3 font-mono text-sm font-semibold text-[#0A0A0A]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4FA3] animate-pulse" />
              <span>LINKING CARRIER NODE TELEMETRY...</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 my-2">
              {REGISTRATION_STEPS.map((step, idx) => {
                const isDone = idx < activeScanStep;
                const isActive = idx === activeScanStep;

                return (
                  <div key={step} className="flex items-center gap-2 font-mono text-xs">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                        isDone
                          ? 'bg-[#0A0A0A] text-white'
                          : isActive
                          ? 'bg-[#FF4FA3] text-white ring-4 ring-[#FF4FA3]/20'
                          : 'bg-[#F0F0F0] text-[#6B6F76]'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`${
                        isActive
                          ? 'text-[#0A0A0A] font-bold'
                          : isDone
                          ? 'text-[#0A0A0A]'
                          : 'text-[#6B6F76]'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Input Form */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <label
                htmlFor="sim-phone-input"
                className="font-mono-label text-xs text-[#6B6F76] uppercase tracking-wider"
              >
                INDIAN MOBILE NUMBER (+91)
              </label>

              <div className="flex items-center rounded-[16px] border border-[#0A0A0A] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#FF4FA3]/30 transition-shadow">
                <span className="px-4 py-4 bg-[#F0F0F0] font-mono text-base sm:text-lg font-semibold text-[#0A0A0A] border-r border-[#0A0A0A]/10 select-none">
                  +91
                </span>
                <input
                  id="sim-phone-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={rawDigits}
                  onChange={handleDigitsChange}
                  placeholder="98201 44210"
                  className="flex-1 px-4 py-4 font-mono text-base sm:text-lg text-[#0A0A0A] placeholder-[#6B6F76]/50 outline-none bg-transparent"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'sim-phone-error' : undefined}
                />
              </div>

              {error && (
                <div
                  id="sim-phone-error"
                  role="alert"
                  className="flex items-center gap-2 text-xs font-mono text-[#DC2626] mt-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2">
                <MagneticButton
                  onClick={handleRegister}
                  disabled={!isValid || isRegistering}
                  variant="primary"
                  size="lg"
                  className="rounded-[16px] text-sm font-semibold flex-1"
                >
                  REGISTER NUMBER
                </MagneticButton>
              </div>

              <p className="text-xs text-[#6B6F76] font-['Inter_Tight'] leading-relaxed mt-2">
                Demo only. The number is not stored and no real carrier is contacted in demo mode.
              </p>
            </div>

            {/* Right: Quick Demo Number Loader */}
            <div className="lg:col-span-5 p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-[#FF4FA3]" />
                <MonoLabel color="ink">QUICK DEMO PRESET</MonoLabel>
              </div>

              <p className="text-xs text-[#6B6F76] font-light leading-relaxed">
                Load a pre-configured synthetic number enrolled with simulated cell tower telemetry and carrier nodes.
              </p>

              <HairlineRow
                borderTop={true}
                borderBottom={false}
                className="py-3 px-1 group mt-2"
                onClick={handleUseDemo}
              >
                <div className="flex flex-col text-left">
                  <span className="font-mono text-xs font-bold text-[#0A0A0A] group-hover:text-[#FF4FA3] transition-colors">
                    +91 98201 44210
                  </span>
                  <span className="font-mono-label text-[10px] text-[#6B6F76]">
                    DEMO TELECOM · PREPAID CIRCLE
                  </span>
                </div>
                <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#FF4FA3] transition-colors">
                  USE DEMO NUMBER ↗
                </span>
              </HairlineRow>
            </div>
          </div>
        )}
      </section>
    );
  }
);

SimRegisterSection.displayName = 'SimRegisterSection';
