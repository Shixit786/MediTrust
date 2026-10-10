import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { Languages } from 'lucide-react';

export const HinglishExplanation: React.FC = React.memo(() => {
  return (
    <div className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#0A0A0A]/10">
        <Languages className="w-4 h-4 text-[#0037FF]" />
        <MonoLabel color="accent" className="text-xs font-semibold tracking-wider">
          SIMPLIFIED EXPLANATION // HINGLISH ADVISORY
        </MonoLabel>
      </div>

      <div className="font-['Inter_Tight'] text-base sm:text-lg text-[#0A0A0A] font-light leading-relaxed">
        <RevealText delay={0.1} stagger={0.1} duration={0.6} splitBy="lines">
          {"Fake job offer, nakli voice call aur SIM swap, teeno ek hi attack ki kadiyan lag rahi hain.\nLink mat kholo, OTP mat do, aur hospital ke official number par call karo."}
        </RevealText>
      </div>
    </div>
  );
});

HinglishExplanation.displayName = 'HinglishExplanation';
