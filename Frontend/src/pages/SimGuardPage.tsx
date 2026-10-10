import React from 'react';
import { MonoLabel } from '../components/ui/MonoLabel';
import { ArrowLink } from '../components/ui/ArrowLink';
import { Smartphone } from 'lucide-react';

export const SimGuardPage: React.FC = React.memo(() => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 min-h-[calc(100vh-220px)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4FA3]" />
          <MonoLabel color="accent" className="text-sm font-semibold tracking-widest">
            COMING NEXT
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mb-8">
          SIM Guard
        </h1>

        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed mb-12">
          SIM swap and account-takeover detection utilizing carrier intelligence, live telemetry streams, Simulation Lab, anomaly detection, and a simulated Freeze Protocol.
        </p>

        <div className="p-8 rounded-[20px] bg-white border border-[#0A0A0A] max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="w-5 h-5 text-[#FF4FA3]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              SPECIFICATION // SIM·GUARD
            </MonoLabel>
          </div>
          <div className="space-y-3 font-mono-label text-xs text-[#6B6F76]">
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>TELEMETRY STREAM</span>
              <span className="text-[#0A0A0A]">LIVE CARRIER ANOMALY RADAR</span>
            </div>
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>DEFENSE PROTOCOL</span>
              <span className="text-[#0A0A0A]">SIMULATED ACCOUNT FREEZE</span>
            </div>
            <div className="flex justify-between">
              <span>PRIVACY COMPLIANCE</span>
              <span className="text-[#FF4FA3]">ZERO TELECOM INTRUSION</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0A0A0A] pt-8 mt-12 flex justify-between items-center">
        <MonoLabel color="muted">PREPARED FOR SIM GUARD INTEGRATION</MonoLabel>
        <ArrowLink to="/dashboard" size="md">
          GO TO DASHBOARD
        </ArrowLink>
      </div>
    </div>
  );
});

SimGuardPage.displayName = 'SimGuardPage';
