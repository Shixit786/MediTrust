import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { MagneticButton } from '../ui/MagneticButton';
import { Check, Zap, MapPin, Smartphone, KeyRound, Play } from 'lucide-react';

interface SimSimulationLabProps {
  isAutoRunning: boolean;
  attackChainSteps: {
    baseline: boolean;
    location: boolean;
    device: boolean;
    otp: boolean;
    freeze: boolean;
  };
  onTriggerLocationJump: () => void;
  onTriggerDeviceSwitch: () => void;
  onTriggerOtpFlood: () => void;
  onTriggerAutoSequence: () => void;
  onResetLab: () => void;
}

const ATTACK_CHAIN_ITEMS: Array<{
  id: 'baseline' | 'location' | 'device' | 'otp' | 'freeze';
  label: string;
}> = [
    { id: 'baseline', label: 'BASELINE' },
    { id: 'location', label: 'LOCATION' },
    { id: 'device', label: 'DEVICE' },
    { id: 'otp', label: 'OTP' },
    { id: 'freeze', label: 'FREEZE' },
  ];

export const SimSimulationLab: React.FC<SimSimulationLabProps> = React.memo(
  ({
    isAutoRunning,
    attackChainSteps,
    onTriggerLocationJump,
    onTriggerDeviceSwitch,
    onTriggerOtpFlood,
    onTriggerAutoSequence,
    onResetLab,
  }) => {
    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="Simulation Lab Attack Testing"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0A0A0A] mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#FF4FA3]" />
              <MonoLabel color="accent">SIMULATION LAB</MonoLabel>
              <span className="font-mono-label text-[11px] text-[#6B6F76] uppercase">
                · SIMULATED TELEMETRY · NO TELECOM ACCESS
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
              Trigger an attack
            </h3>
          </div>

          <button
            onClick={onResetLab}
            disabled={isAutoRunning}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6B6F76] hover:text-[#0A0A0A] disabled:opacity-40 uppercase transition-colors self-start sm:self-auto py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A]"
          >
            <span>RESET LAB</span>
            <span>↗</span>
          </button>
        </div>

        {/* Dotted Attack Chain Strip */}
        <div className="mb-10">
          <div className="text-[11px] font-mono-label text-[#6B6F76] uppercase tracking-wider mb-4">
            ATTACK RECONSTRUCTION CHAIN:
          </div>

          <div className="relative flex items-center justify-between">
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-[#0A0A0A]/20 -z-0"
              aria-hidden="true"
            />

            {ATTACK_CHAIN_ITEMS.map((item, idx) => {
              const isDone = attackChainSteps[item.id];

              return (
                <div
                  key={item.id}
                  className="relative z-10 flex flex-col items-center bg-white px-2 sm:px-3"
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-opacity duration-300 ${isDone
                        ? 'bg-[#FF4FA3] text-white ring-4 ring-[#FF4FA3]/20'
                        : 'bg-white border border-[#0A0A0A]/30 text-[#6B6F76] opacity-60'
                      }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-2 font-mono-label text-[10px] sm:text-xs tracking-wider transition-opacity duration-300 text-center ${isDone ? 'text-[#0A0A0A] font-bold' : 'text-[#6B6F76] opacity-60'
                      }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2x2 Grid of Attack Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Location Jump */}
          <div className="p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 flex flex-col justify-between hover:border-[#0A0A0A] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#0A0A0A] tracking-wider uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF4FA3]" />
                  LOCATION JUMP
                </span>
                <span className="text-[10px] font-mono text-[#6B6F76]">VEC · 01</span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F76] font-light leading-relaxed mb-6">
                Login from a city 900 km away within minutes. Simulates cell tower transition without transit time.
              </p>
            </div>

            <button
              onClick={onTriggerLocationJump}
              disabled={isAutoRunning}
              className="inline-flex items-center justify-between py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A] text-xs font-mono text-[#0A0A0A] hover:bg-white transition-colors disabled:opacity-40"
            >
              <span>DISPATCH TELEMETRY</span>
              <span>RUN ↗</span>
            </button>
          </div>

          {/* Card 2: OTP Flood */}
          <div className="p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 flex flex-col justify-between hover:border-[#0A0A0A] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#0A0A0A] tracking-wider uppercase flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#FF4FA3]" />
                  OTP FLOOD
                </span>
                <span className="text-[10px] font-mono text-[#6B6F76]">VEC · 02</span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F76] font-light leading-relaxed mb-6">
                Seven OTP requests in forty seconds. Simulates aggressive brute-force 2FA credential harvesting.
              </p>
            </div>

            <button
              onClick={onTriggerOtpFlood}
              disabled={isAutoRunning}
              className="inline-flex items-center justify-between py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A] text-xs font-mono text-[#0A0A0A] hover:bg-white transition-colors disabled:opacity-40"
            >
              <span>TRIGGER OTP BURST</span>
              <span>RUN ↗</span>
            </button>
          </div>

          {/* Card 3: Device Switch */}
          <div className="p-6 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 flex flex-col justify-between hover:border-[#0A0A0A] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#0A0A0A] tracking-wider uppercase flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#FF4FA3]" />
                  DEVICE SWITCH
                </span>
                <span className="text-[10px] font-mono text-[#6B6F76]">VEC · 03</span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B6F76] font-light leading-relaxed mb-6">
                Number activated on an unknown handset. Simulates sudden hardware IMEI change on the carrier network.
              </p>
            </div>

            <button
              onClick={onTriggerDeviceSwitch}
              disabled={isAutoRunning}
              className="inline-flex items-center justify-between py-2 px-3 rounded-lg border border-[#0A0A0A]/20 hover:border-[#0A0A0A] text-xs font-mono text-[#0A0A0A] hover:bg-white transition-colors disabled:opacity-40"
            >
              <span>SIMULATE IMEI SWAP</span>
              <span>RUN ↗</span>
            </button>
          </div>

          {/* Card 4: AUTO ATTACK SEQUENCE (Highlighted black card) */}
          <div className="p-6 rounded-[16px] bg-[#0A0A0A] text-white flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#FF4FA3] tracking-wider uppercase flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-[#FF4FA3]" />
                  AUTO ATTACK SEQUENCE
                </span>
                <span className="text-[10px] font-mono text-white/50">FULL CHAIN</span>
              </div>
              <p className="text-xs sm:text-sm text-white/80 font-light leading-relaxed mb-6">
                Runs the full chain: Location Jump, IMEI Switch, OTP Flood, Anomaly Spike, and engages the Freeze Protocol.
              </p>
            </div>

            <MagneticButton
              onClick={onTriggerAutoSequence}
              disabled={isAutoRunning}
              variant="secondary"
              size="md"
              className="w-full rounded-xl text-xs font-bold tracking-widest uppercase bg-[#FF4FA3] hover:bg-[#ff3b99] text-[#0A0A0A]"
            >
              {isAutoRunning ? 'CHAIN EXECUTING...' : 'RUN FULL CHAIN ↗'}
            </MagneticButton>
          </div>
        </div>
      </section>
    );
  }
);

SimSimulationLab.displayName = 'SimSimulationLab';
