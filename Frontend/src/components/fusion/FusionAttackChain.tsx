import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MonoLabel } from '../ui/MonoLabel';
import type { FusionChainStep } from '../../types/analysis';
import { isLowTierHardware } from '../../utils/perfGuard';

interface FusionAttackChainProps {
  steps: FusionChainStep[];
}

export const FusionAttackChain: React.FC<FusionAttackChainProps> = React.memo(({ steps }) => {
  const prefersReduced = useReducedMotion();
  const isLowTier = isLowTierHardware();
  const skipMotion = prefersReduced || isLowTier;

  return (
    <div className="flex flex-col gap-8">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10">
        <MonoLabel color="muted">ATTACK CHAIN RECONSTRUCTION // 4-STAGE TIMELINE</MonoLabel>
        <span className="font-mono-label text-xs text-[#6B6F76]">
          CHRONOLOGICAL SYNTHESIS
        </span>
      </div>

      {/* Timeline container */}
      <div className="relative">
        {/* Desktop dotted connecting track behind the cards */}
        <div className="hidden lg:block absolute top-12 left-10 right-10 h-[2px] border-b-2 border-dashed border-[#0A0A0A]/20 -z-0 pointer-events-none" />

        {/* 4 Cards Grid: 4 columns on large screens, vertical stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {steps.map((step, idx) => {
            const isDetected = step.status === 'DETECTED';
            const isPredicted = step.status === 'PREDICTED';
            const isNotDetected = step.status === 'NOT DETECTED';

            return (
              <motion.div
                key={step.stepNumber}
                initial={skipMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  duration: 0.45,
                  delay: skipMotion ? 0 : 0.1 * idx,
                  ease: 'easeOut',
                }}
                className={`rounded-[20px] p-6 flex flex-col justify-between min-h-[300px] transition-colors ${isNotDetected
                    ? 'bg-white/60 border border-dashed border-[#0A0A0A]/25 opacity-75'
                    : 'bg-white border border-[#0A0A0A]'
                  }`}
              >
                <div>
                  {/* Top: Step Number + Status Chip */}
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#0A0A0A]/10">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: step.color }}
                      />
                      <span className="font-mono-label text-xs font-bold text-[#0A0A0A]">
                        0{step.stepNumber}
                      </span>
                    </div>

                    {isDetected ? (
                      <span className="px-2 py-0.5 rounded bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-[#E11D2E] font-mono-label text-[10px] font-bold">
                        DETECTED
                      </span>
                    ) : isPredicted ? (
                      <span className="px-2 py-0.5 rounded bg-[#0037FF]/10 border border-[#0037FF]/30 text-[#0037FF] font-mono-label text-[10px] font-bold">
                        PREDICTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#0A0A0A]/5 border border-[#0A0A0A]/15 text-[#6B6F76] font-mono-label text-[10px]">
                        NOT DETECTED
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-['Inter_Tight'] font-medium text-lg text-[#0A0A0A] mb-4 leading-snug">
                    {step.title}
                  </h3>

                  {/* Evidence list */}
                  <div className="space-y-2 mb-6">
                    {step.evidence.slice(0, 3).map((item, eIdx) => (
                      <div key={eIdx} className="flex items-start gap-2 text-xs text-[#6B6F76] leading-relaxed">
                        <span className="text-[#0A0A0A] mt-1 shrink-0">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Score if available */}
                <div className="pt-4 border-t border-[#0A0A0A]/10 flex items-center justify-between">
                  <span className="font-mono-label text-[10px] text-[#6B6F76]">
                    {step.shield.toUpperCase()} VECTOR
                  </span>
                  {typeof step.score === 'number' ? (
                    <span className="font-mono-label text-xs font-semibold text-[#0A0A0A]">
                      RISK {step.score}
                    </span>
                  ) : (
                    <span className="font-mono-label text-[10px] text-[#6B6F76]">
                      {isPredicted ? 'NEXT TRAJECTORY' : 'INACTIVE'}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

FusionAttackChain.displayName = 'FusionAttackChain';
