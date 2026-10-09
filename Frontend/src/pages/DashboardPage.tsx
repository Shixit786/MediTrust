import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MonoLabel } from '../components/ui/MonoLabel';
import { ArrowLink } from '../components/ui/ArrowLink';
import { Shield, Radio, FileText, Cpu } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-16 sm:py-24 min-h-[calc(100vh-220px)] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF] animate-pulse" />
          <MonoLabel color="accent" className="text-sm font-semibold tracking-widest">
            COMING NEXT
          </MonoLabel>
          {isDemo && (
            <span className="ml-2 px-3 py-0.5 rounded-full bg-[#0037FF]/10 text-[#0037FF] font-mono-label text-xs">
              DEMO ATTACK PRESET QUEUED
            </span>
          )}
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mb-8">
          Dashboard
        </h1>

        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-2xl leading-relaxed mb-12">
          The unified digital security dashboard is preparing multi-vector threat ingestion across live microphone audio, WhatsApp/PDF recruitment offers, and carrier telemetry streams.
        </p>

        {/* 3 Shields + Fusion Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-[#0A0A0A] pt-10">
          <div className="p-6 rounded-[20px] bg-white/80 border border-[#0A0A0A] backdrop-blur-sm">
            <Radio className="w-6 h-6 text-[#3B5BFF] mb-4" />
            <MonoLabel color="ink" className="text-xs font-semibold block mb-2">
              VOICE SHIELD
            </MonoLabel>
            <p className="text-xs text-[#6B6F76] mb-4">
              9 spectral features, neural synapse visualizer, and synthetic audio detection.
            </p>
            <ArrowLink to="/voice" size="sm">OPEN SHIELD</ArrowLink>
          </div>

          <div className="p-6 rounded-[20px] bg-white/80 border border-[#0A0A0A] backdrop-blur-sm">
            <FileText className="w-6 h-6 text-[#F5B800] mb-4" />
            <MonoLabel color="ink" className="text-xs font-semibold block mb-2">
              JOB SHIELD
            </MonoLabel>
            <p className="text-xs text-[#6B6F76] mb-4">
              WhatsApp offers and PDFs scanned for fake jobs, phishing URLs, and fake companies.
            </p>
            <ArrowLink to="/job" size="sm">OPEN SHIELD</ArrowLink>
          </div>

          <div className="p-6 rounded-[20px] bg-white/80 border border-[#0A0A0A] backdrop-blur-sm">
            <Shield className="w-6 h-6 text-[#FF4FA3] mb-4" />
            <MonoLabel color="ink" className="text-xs font-semibold block mb-2">
              SIM GUARD
            </MonoLabel>
            <p className="text-xs text-[#6B6F76] mb-4">
              Carrier intelligence, live telemetry stream, and simulated freeze protocol.
            </p>
            <ArrowLink to="/sim" size="sm">OPEN SHIELD</ArrowLink>
          </div>

          <div className="p-6 rounded-[20px] bg-white/80 border border-[#0A0A0A] backdrop-blur-sm">
            <Cpu className="w-6 h-6 text-[#0037FF] mb-4" />
            <MonoLabel color="ink" className="text-xs font-semibold block mb-2">
              FUSION ENGINE
            </MonoLabel>
            <p className="text-xs text-[#6B6F76] mb-4">
              Cross-signal correlation, composite risk scoring, and attack-chain synthesis.
            </p>
            <ArrowLink to="/fusion" size="sm">OPEN ENGINE</ArrowLink>
          </div>
        </div>
      </div>

      <div className="border-t border-[#0A0A0A] pt-8 mt-12 flex justify-between items-center">
        <MonoLabel color="muted">UNIFIED DIGITAL SECURITY ARCHITECTURE</MonoLabel>
        <ArrowLink to="/" size="md">
          RETURN TO HOME
        </ArrowLink>
      </div>
    </div>
  );
};
