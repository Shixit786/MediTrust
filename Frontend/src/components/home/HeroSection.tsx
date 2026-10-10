import React, { useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { ArrowLink } from '../ui/ArrowLink';
import { BigNumber } from '../ui/BigNumber';
import { RevealText } from '../ui/RevealText';
import { isLowTierHardware } from '../../utils/perfGuard';

export const HeroSection: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const isLowTier = isLowTierHardware();

  const handleScrollDown = useCallback(() => {
    const shieldSection = document.getElementById('shields-showcase');
    if (shieldSection) {
      shieldSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between pt-8 sm:pt-14 pb-8 overflow-hidden">
      {/* Top Container: Tag + Huge Heading + Subtitle */}
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14">
        {/* Top Tag */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8 flex items-center gap-3"
        >
          <span className="w-2 h-2 rounded-full bg-[#0037FF] opacity-75" />
          <MonoLabel color="muted" className="text-xs sm:text-sm font-semibold tracking-[0.12em]">
            UNIFIED DIGITAL SECURITY
          </MonoLabel>
        </motion.div>

        {/* Huge Heading: clamp(52px, 10.5vw, 180px) */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-[clamp(52px,10.5vw,180px)] font-light font-['Inter_Tight'] leading-[0.92] tracking-[-0.035em] text-[#0A0A0A]">
            <RevealText delay={0.15} stagger={0.14} duration={0.85}>
              {"Judge the whole\nattack."}
            </RevealText>
          </h1>
        </div>

        {/* Muted Subtitle under Heading */}
        <motion.p
          initial={prefersReduced || isLowTier ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-lg sm:text-[20px] text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-2xl leading-relaxed mb-10 sm:mb-14"
        >
          Unified digital security and multi-vector threat protection for healthcare.
        </motion.p>
      </div>

      {/* Action Rows: Full width hairlines */}
      <motion.div
        initial={prefersReduced || isLowTier ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full border-t border-b border-[#0A0A0A] bg-[#FFFFFF]/75"
      >
        <div className="w-full max-w-[1400px] mx-auto">
          {/* Row 1: Open Dashboard */}
          <HairlineRow
            borderTop={false}
            borderBottom={true}
            className="py-5 sm:py-7 px-6 sm:px-10 md:px-14 group"
            onClick={() => navigate('/dashboard')}
          >
            <div className="flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-[#0A0A0A] group-hover:bg-[#0037FF] transition-colors" />
              <MonoLabel color="ink" className="text-xs sm:text-sm font-semibold">
                NEW SCAN
              </MonoLabel>
            </div>
            <ArrowLink to="/dashboard" size="hero" className="group-hover:translate-x-1 transition-transform">
              OPEN DASHBOARD
            </ArrowLink>
          </HairlineRow>

          {/* Row 2: Load Demo Attack */}
          <HairlineRow
            borderTop={false}
            borderBottom={false}
            className="py-5 sm:py-7 px-6 sm:px-10 md:px-14 group"
            onClick={() => navigate('/dashboard?demo=1')}
          >
            <div className="flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-[#0A0A0A]/40 group-hover:bg-[#0037FF] transition-colors" />
              <MonoLabel color="muted" className="text-xs sm:text-sm font-semibold group-hover:text-[#0A0A0A] transition-colors">
                SEE IT IN ACTION
              </MonoLabel>
            </div>
            <ArrowLink to="/dashboard?demo=1" size="hero" className="group-hover:translate-x-1 transition-transform">
              LOAD DEMO ATTACK
            </ArrowLink>
          </HairlineRow>
        </div>
      </motion.div>

      {/* Bottom stats strip & scroll indicator */}
      <motion.div
        initial={prefersReduced || isLowTier ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 pt-8 sm:pt-10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 border-y sm:border-y-0 sm:border-t border-[#0A0A0A] py-6 sm:py-0">
          {/* Stat 1 */}
          <div className="sm:border-r border-[#0A0A0A] sm:py-6 sm:pr-8 flex items-baseline justify-between sm:justify-start sm:gap-4">
            <BigNumber value={3} size="lg" animate={true} duration={1.4} />
            <div className="flex flex-col">
              <MonoLabel color="ink" className="text-xs font-semibold">
                SHIELDS
              </MonoLabel>
              <span className="text-[11px] text-[#6B6F76] font-mono-label font-normal">
                VOICE · JOB · SIM
              </span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="sm:border-r border-[#0A0A0A] sm:py-6 sm:px-8 flex items-baseline justify-between sm:justify-start sm:gap-4">
            <BigNumber value={1} size="lg" animate={true} duration={1.2} />
            <div className="flex flex-col">
              <MonoLabel color="ink" className="text-xs font-semibold">
                FUSION ENGINE
              </MonoLabel>
              <span className="text-[11px] text-[#6B6F76] font-mono-label font-normal">
                CROSS-SIGNAL CORRELATION
              </span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="sm:py-6 sm:pl-8 flex items-baseline justify-between sm:justify-start sm:gap-4">
            <BigNumber value={0} size="lg" animate={true} duration={1.0} />
            <div className="flex flex-col">
              <MonoLabel color="ink" className="text-xs font-semibold">
                BLIND SPOTS
              </MonoLabel>
              <span className="text-[11px] text-[#6B6F76] font-mono-label font-normal">
                HOLISTIC ATTACK RECONSTRUCTION
              </span>
            </div>
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#0A0A0A]/15">
          <MonoLabel color="subtle" className="text-[11px]">
            SCROLL TO EXPLORE ARCHITECTURE
          </MonoLabel>
          <button
            type="button"
            onClick={handleScrollDown}
            aria-label="Scroll to shield showcase"
            className="group flex items-center gap-3 text-xs font-mono-label text-[#0A0A0A] hover:text-[#0037FF] transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            <span>SCROLL</span>
            <div className="w-[1px] h-6 bg-[#0A0A0A]/30 relative overflow-hidden">
              <motion.div
                className="w-full h-1/2 bg-[#0037FF] will-change-transform"
                animate={
                  prefersReduced || isLowTier
                    ? {}
                    : {
                        y: [-12, 24],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </button>
        </div>
      </motion.div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
