import React from 'react';
import { MonoLabel } from '../components/ui/MonoLabel';
import { ArrowLink } from '../components/ui/ArrowLink';
import { FileText } from 'lucide-react';

export const JobShieldPage: React.FC = () => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 min-h-[calc(100vh-220px)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F5B800] animate-pulse" />
          <MonoLabel color="accent" className="text-sm font-semibold tracking-widest">
            COMING NEXT
          </MonoLabel>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mb-8">
          Job Shield
        </h1>

        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed mb-12">
          Fake job and phishing detection protecting healthcare professionals and applicants. Scans WhatsApp job messages and PDF offers, extracts URLs, runs six threat-intelligence checks, AI scam analysis, and MCA21 company verification.
        </p>

        <div className="p-8 rounded-[20px] bg-white/80 border border-[#0A0A0A] max-w-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-[#F5B800]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              SPECIFICATION // JOB·SHIELD
            </MonoLabel>
          </div>
          <div className="space-y-3 font-mono-label text-xs text-[#6B6F76]">
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>THREAT INTEL</span>
              <span className="text-[#0A0A0A]">06 INTELLIGENCE FEEDS</span>
            </div>
            <div className="flex justify-between border-b border-[#0A0A0A]/10 pb-2">
              <span>VERIFICATION</span>
              <span className="text-[#0A0A0A]">MCA21 CORPORATE REGISTRY</span>
            </div>
            <div className="flex justify-between">
              <span>EXTRACTION</span>
              <span className="text-[#F5B800]">PDF + WHATSAPP OCR / NLP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0A0A0A] pt-8 mt-12 flex justify-between items-center">
        <MonoLabel color="muted">PREPARED FOR JOB SHIELD INTEGRATION</MonoLabel>
        <ArrowLink to="/dashboard" size="md">
          GO TO DASHBOARD
        </ArrowLink>
      </div>
    </div>
  );
};
