import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ShieldId } from '../../types/analysis';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { ArrowLink } from '../ui/ArrowLink';
import { BigNumber } from '../ui/BigNumber';
import { ShieldIllustration } from './ShieldIllustration';

interface ShieldData {
  id: ShieldId;
  name: string;
  dotColor: string;
  bgTint: string;
  route: string;
  tagline: string;
  description: string;
  checks: string[];
  totalCount: number;
  badges: string[];
  specialNote?: string;
}

const shields: ShieldData[] = [
  {
    id: 'voice',
    name: 'voice·shield',
    dotColor: '#3B5BFF',
    bgTint: 'rgba(59, 91, 255, 0.08)',
    route: '/voice',
    tagline: 'Deepfake Audio & Speech Forensics',
    description: 'Live recording or upload. Nine spectral features reveal synthetic voices.',
    checks: [
      'MFCC ANOMALY',
      'SPECTRAL FLUX',
      'SILENCE PURITY',
      'PITCH VARIANCE',
      'BREATHING PATTERN',
    ],
    totalCount: 9,
    badges: ['NEURAL SYNAPSE VISUALIZER', 'AI FORENSICS REPORT'],
  },
  {
    id: 'job',
    name: 'job·shield',
    dotColor: '#F5B800',
    bgTint: 'rgba(245, 184, 0, 0.09)',
    route: '/job',
    tagline: 'Fake Recruitment & Phishing Scanner',
    description: 'WhatsApp offers and PDFs scanned for fake jobs, phishing links and fake companies.',
    checks: [
      'GOOGLE SAFE BROWSING',
      'VIRUSTOTAL',
      'URLHAUS',
      'ABUSEIPDB',
      'SECURITYTRAILS',
    ],
    totalCount: 6,
    badges: ['HEURISTIC ENGINE', 'AI SCAM ANALYSIS', 'COMPANY VERIFICATION (MCA21)'],
  },
  {
    id: 'sim',
    name: 'sim·guard',
    dotColor: '#FF4FA3',
    bgTint: 'rgba(255, 79, 163, 0.08)',
    route: '/sim',
    tagline: 'Carrier Telemetry & SIM Hijack Defense',
    description: 'Carrier intelligence plus a live telemetry stream to catch SIM swaps and OTP hijacking.',
    checks: [
      'CARRIER INTELLIGENCE',
      'LOCATION JUMP',
      'OTP FLOOD',
      'DEVICE SWITCH',
      'AUTO ATTACK SEQUENCE',
    ],
    totalCount: 6,
    badges: ['FREEZE PROTOCOL (SIMULATED)', 'SIMULATED TELEMETRY · NO TELECOM ACCESS'],
  },
];

export const ShieldShowcase: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  return (
    <section id="shields-showcase" className="relative w-full py-20 sm:py-28 overflow-hidden">
      {/* Section Header */}
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 mb-16 sm:mb-24">
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
              DISCOVER THE SHIELDS
            </MonoLabel>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] mt-2">
            Three shields. One engine.
          </h2>
        </motion.div>
      </div>

      {/* Vertical Stack of 3 Shield Blocks */}
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 flex flex-col gap-12 sm:gap-20">
        {shields.map((shield, index) => {
          const isEven = index % 2 === 1;

          return (
            <motion.div
              id={shield.id}
              key={shield.id}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch"
            >
              {/* Illustration Card */}
              <div
                className={`relative bg-white rounded-[20px] border border-[#0A0A0A] p-8 sm:p-10 flex flex-col justify-between min-h-[380px] sm:min-h-[440px] shadow-sm overflow-hidden ${
                  isEven ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <div className="flex items-center justify-between z-10">
                  <MonoLabel color="muted" className="text-xs">
                    0{index + 1} // SIGNAL MODULE
                  </MonoLabel>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: shield.dotColor }}
                    />
                  </div>
                </div>

                <div className="my-auto py-6">
                  <ShieldIllustration shield={shield.id} accentColor={shield.dotColor} />
                </div>

                <div className="z-10 flex justify-between items-end border-t border-[#0A0A0A]/10 pt-4">
                  <span className="font-['Inter_Tight'] font-medium text-sm text-[#0A0A0A]">
                    {shield.tagline}
                  </span>
                  <MonoLabel color="accent" className="text-[11px]">
                    ACTIVE
                  </MonoLabel>
                </div>
              </div>

              {/* Info Panel */}
              <div
                className={`relative rounded-[20px] border border-[#0A0A0A] p-8 sm:p-10 flex flex-col justify-between min-h-[380px] sm:min-h-[440px] backdrop-blur-md ${
                  isEven ? 'lg:order-1' : 'lg:order-2'
                }`}
                style={{ backgroundColor: shield.bgTint }}
              >
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="font-['Inter_Tight'] font-bold text-3xl sm:text-4xl tracking-tight text-[#0A0A0A] lowercase">
                      {shield.name}
                    </h3>
                    <span className="font-mono-label text-xs text-[#0A0A0A]/50">
                      SPECS v2.0
                    </span>
                  </div>

                  <div className="w-full h-[2px] bg-[#0A0A0A] mb-6" />

                  {/* 5 Hairline rows */}
                  <div className="flex flex-col border-y border-[#0A0A0A]">
                    {shield.checks.map((check, checkIdx) => (
                      <HairlineRow
                        key={check}
                        borderTop={false}
                        borderBottom={checkIdx !== shield.checks.length - 1}
                        interactive={true}
                        hoverAccentColor="rgba(0, 55, 255, 0.08)"
                        className="py-2.5 sm:py-3 px-1 group"
                        onClick={() => navigate(shield.route)}
                      >
                        <span className="font-mono-label text-xs text-[#0A0A0A] group-hover:text-[#0037FF] transition-colors font-medium">
                          {check}
                        </span>
                        <span className="font-mono-label text-xs text-[#0A0A0A]/50 group-hover:text-[#0037FF] transition-colors tabular-nums">
                          0{checkIdx + 1}
                        </span>
                      </HairlineRow>
                    ))}
                  </div>

                  {/* Short Description */}
                  <p className="text-xs sm:text-sm text-[#6B6F76] font-['Inter_Tight'] mt-4 leading-relaxed">
                    {shield.description}
                  </p>

                  {/* Badges / Sub-labels */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {shield.badges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/70 border border-[#0A0A0A]/20 text-[10px] font-mono-label text-[#0A0A0A]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: shield.dotColor }} />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Total count & Action Link */}
                <div className="flex items-end justify-between pt-6 border-t border-[#0A0A0A]/20 mt-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[#0A0A0A]/40 font-mono-label text-base tracking-widest leading-none">
                      ...
                    </span>
                    <BigNumber value={shield.totalCount} size="lg" />
                    <span className="font-mono-label text-xs text-[#6B6F76] font-normal pb-1">
                      FEATURE VECTORS
                    </span>
                  </div>

                  <ArrowLink to={shield.route} size="md" className="group-hover:translate-x-1 transition-transform">
                    EXPLORE
                  </ArrowLink>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
