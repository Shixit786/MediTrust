import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { ArrowLink } from '../ui/ArrowLink';
import { HairlineRow } from '../ui/HairlineRow';
import { ArrowRight, Cpu, Layers } from 'lucide-react';

const timelineSteps = [
  { name: 'VOICE SHIELD', sub: 'Deepfake & speech forensics', color: '#3B5BFF' },
  { name: 'JOB SHIELD', sub: 'Fake offer & URL threat intel', color: '#F5B800' },
  { name: 'SIM GUARD', sub: 'Carrier & swap telemetry', color: '#FF4FA3' },
];

const demoSequenceSteps = [
  { step: '01', title: 'FAKE JOB OFFER', desc: 'WhatsApp & PDF scan' },
  { step: '02', title: 'SUSPICIOUS VOICE CALL', desc: 'Cloned audio intake' },
  { step: '03', title: 'SIM-SWAP SIMULATION', desc: 'Carrier IMSI hijack' },
  { step: '04', title: 'FUSION ENGINE', desc: 'Attack chain synthesis' },
];

export const FusionEngineBand: React.FC = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative w-full border-t border-b border-[#0A0A0A] bg-white/60 backdrop-blur-md py-20 sm:py-28 overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14">
        {/* Top Header */}
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 mb-16"
        >
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
              THE INTEGRATION LAYER
            </MonoLabel>
          </div>

          <h2 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A]">
            Fusion Engine
          </h2>

          <p className="text-lg sm:text-xl md:text-2xl text-[#6B6F76] font-light max-w-3xl leading-relaxed mt-2">
            Three signals become one picture. We connect the voice, the job offer and the SIM activity to see whether they form one coordinated attack.
          </p>
        </motion.div>

        {/* Dotted Horizontal Timeline with 3 Converging Dots */}
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative bg-white rounded-[20px] border border-[#0A0A0A] p-8 sm:p-12 mb-12 shadow-sm overflow-hidden"
        >
          {/* Timeline Label */}
          <div className="flex items-center justify-between border-b border-[#0A0A0A]/10 pb-4 mb-10">
            <MonoLabel color="muted">CROSS-VECTOR INTEGRATION PIPELINE</MonoLabel>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0037FF]" />
              <MonoLabel color="accent">SYNTHESIS ENGINE</MonoLabel>
            </div>
          </div>

          {/* Desktop/Tablet Horizontal Track with 3 steps -> 1 Verdict */}
          <div className="relative py-8">
            <div className="hidden md:block absolute top-[28px] left-12 right-40 h-[2px] border-b-2 border-dashed border-[#0A0A0A]/25 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 items-center relative z-10">
              {timelineSteps.map((step, idx) => (
                <div key={step.name} className="flex flex-col items-start md:items-center text-left md:text-center group">
                  <motion.div
                    initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: 0.3 + idx * 0.25,
                      type: 'spring',
                      stiffness: 300,
                    }}
                    className="relative w-14 h-14 rounded-full bg-white border border-[#0A0A0A] flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform"
                  >
                    <motion.div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: step.color }}
                      animate={
                        prefersReduced
                          ? {}
                          : {
                              boxShadow: [
                                `0 0 0 0px ${step.color}40`,
                                `0 0 0 8px ${step.color}00`,
                              ],
                            }
                      }
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: idx * 0.4,
                      }}
                    />
                  </motion.div>

                  <MonoLabel color="ink" className="text-xs font-semibold mb-1">
                    {step.name}
                  </MonoLabel>
                  <span className="text-xs text-[#6B6F76] font-normal">{step.sub}</span>
                </div>
              ))}

              {/* Converged Final Engine Node */}
              <div className="flex flex-col items-start md:items-center text-left md:text-center mt-4 md:mt-0">
                <motion.div
                  initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: 1.1,
                    type: 'spring',
                    stiffness: 250,
                  }}
                  className="relative w-16 h-16 rounded-full bg-[#0037FF] text-white flex items-center justify-center mb-4 shadow-lg ring-4 ring-[#0037FF]/20"
                >
                  <motion.div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    animate={
                      prefersReduced
                        ? {}
                        : {
                            scale: [1, 1.1, 1],
                          }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 2.5,
                      ease: 'easeInOut',
                    }}
                  >
                    <ArrowRight className="w-6 h-6 text-white" />
                  </motion.div>
                </motion.div>

                <MonoLabel color="accent" className="text-xs font-bold mb-1">
                  UNIFIED VERDICT
                </MonoLabel>
                <span className="text-xs text-[#0A0A0A] font-medium">Composite Risk & Actions</span>
              </div>
            </div>
          </div>

          {/* Three Mono Labels Separated by Hairlines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#0A0A0A] pt-6 mt-6">
            <div className="flex flex-col sm:border-r border-[#0A0A0A]/20 sm:pr-4">
              <MonoLabel color="ink" className="text-xs font-semibold">
                OVERALL RISK
              </MonoLabel>
              <span className="text-xs text-[#6B6F76] mt-1 font-['Inter_Tight']">
                Harmonized probabilistic score across all three modalities.
              </span>
            </div>

            <div className="flex flex-col sm:border-r border-[#0A0A0A]/20 sm:px-4">
              <MonoLabel color="ink" className="text-xs font-semibold">
                ATTACK-CHAIN ANALYSIS
              </MonoLabel>
              <span className="text-xs text-[#6B6F76] mt-1 font-['Inter_Tight']">
                Chronological sequence reconstruction connecting vectors.
              </span>
            </div>

            <div className="flex flex-col sm:pl-4">
              <MonoLabel color="ink" className="text-xs font-semibold">
                RECOMMENDED ACTION
              </MonoLabel>
              <span className="text-xs text-[#6B6F76] mt-1 font-['Inter_Tight']">
                Prioritized clinical defense and simulated account freeze.
              </span>
            </div>
          </div>

          {/* Small Muted Note */}
          <div className="mt-6 pt-4 border-t border-[#0A0A0A]/10 flex items-center gap-2 text-xs text-[#6B6F76]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B6F76]" />
            <span className="italic font-light">Freeze and block actions are simulated in the demo.</span>
          </div>
        </motion.div>

        {/* Demo Sequence 4 Steps Strip */}
        <div className="mb-12 bg-white/80 rounded-[20px] border border-[#0A0A0A] p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 border-b border-[#0A0A0A]/10 pb-3">
            <MonoLabel color="subtle">CORRELATION WORKFLOW PREVIEW</MonoLabel>
            <MonoLabel color="accent">4-PHASE SIMULATION</MonoLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoSequenceSteps.map((item, idx) => (
              <div
                key={item.step}
                className={`flex flex-col p-3 rounded-lg ${
                  idx < 3 ? 'lg:border-r border-[#0A0A0A]/15' : ''
                }`}
              >
                <span className="font-mono-label text-xs text-[#0037FF] font-bold">
                  {item.step}
                </span>
                <span className="font-['Inter_Tight'] font-semibold text-sm text-[#0A0A0A] mt-1">
                  {item.title}
                </span>
                <span className="text-xs text-[#6B6F76] mt-0.5">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Final Hairline ArrowLink Row */}
        <div className="w-full border-t border-b border-[#0A0A0A]">
          <HairlineRow
            borderTop={false}
            borderBottom={false}
            className="py-6 sm:py-8 px-2 sm:px-4 group"
            onClick={() => navigate('/dashboard')}
          >
            <div className="flex items-center gap-4">
              <span className="w-3 h-3 rounded-full bg-[#0037FF]" />
              <MonoLabel color="ink" className="text-xs sm:text-sm font-semibold">
                READY TO PROTECT HEALTHCARE OPERATIONS
              </MonoLabel>
            </div>
            <ArrowLink to="/dashboard" size="hero" className="group-hover:translate-x-2 transition-transform">
              OPEN DASHBOARD
            </ArrowLink>
          </HairlineRow>
        </div>
      </div>
    </section>
  );
};
