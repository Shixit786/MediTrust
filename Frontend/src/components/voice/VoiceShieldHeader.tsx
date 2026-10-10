import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { USE_MOCK } from '../../services/api';

export const VoiceShieldHeader: React.FC = React.memo(() => {
  return (
    <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#0A0A0A]">
      {/* Left: Tag + Heading + Subtitle */}
      <div className="flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B5BFF]" aria-hidden="true" />
          <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
            SHIELD 02 · DEEPFAKE AUDIO DETECTION
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none mb-4">
          <RevealText delay={0.05} stagger={0.08} duration={0.6}>
            Voice Shield
          </RevealText>
        </h1>

        <p className="text-base sm:text-lg text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-2xl leading-relaxed mb-3">
          Record a call or upload audio. Nine spectral features reveal whether a voice feels synthetic.
        </p>

        <p className="font-mono-label text-[11px] text-[#6B6F76] tracking-wider uppercase">
          * RISK INDICATOR, NOT PROOF. RESULTS NEED HUMAN VERIFICATION.
        </p>
      </div>

      {/* Right side: Status chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#0A0A0A] select-none">
          <span className="w-2 h-2 rounded-full bg-[#3B5BFF]" aria-hidden="true" />
          <span className="font-mono-label text-[11px] text-[#0A0A0A] font-semibold">
            ACOUSTIC FORENSICS ACTIVE
          </span>
        </div>

        {USE_MOCK && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3B5BFF]/10 border border-[#3B5BFF]/40 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BFF]" aria-hidden="true" />
            <MonoLabel color="accent" className="text-[11px] font-semibold">
              DEMO DATA
            </MonoLabel>
          </div>
        )}
      </div>
    </div>
  );
});

VoiceShieldHeader.displayName = 'VoiceShieldHeader';
