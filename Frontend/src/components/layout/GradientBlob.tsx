import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import type { BlobTone } from '../../types/analysis';

export interface GradientBlobProps {
  tone?: BlobTone;
  className?: string;
}

const toneGradients: Record<BlobTone, { c1: string; c2: string; c3: string; c4: string }> = {
  idle: {
    c1: 'rgba(181, 240, 255, 0.65)',
    c2: 'rgba(111, 163, 255, 0.55)',
    c3: 'rgba(165, 180, 252, 0.60)',
    c4: 'rgba(0, 55, 255, 0.25)',
  },
  low: {
    c1: 'rgba(187, 247, 208, 0.65)',
    c2: 'rgba(74, 222, 128, 0.50)',
    c3: 'rgba(34, 197, 94, 0.35)',
    c4: 'rgba(134, 239, 172, 0.45)',
  },
  medium: {
    c1: 'rgba(254, 240, 138, 0.65)',
    c2: 'rgba(251, 191, 36, 0.50)',
    c3: 'rgba(245, 158, 11, 0.35)',
    c4: 'rgba(253, 230, 138, 0.45)',
  },
  high: {
    c1: 'rgba(254, 215, 170, 0.65)',
    c2: 'rgba(251, 146, 60, 0.50)',
    c3: 'rgba(249, 115, 22, 0.35)',
    c4: 'rgba(255, 237, 213, 0.45)',
  },
  critical: {
    c1: 'rgba(254, 205, 211, 0.70)',
    c2: 'rgba(244, 63, 94, 0.50)',
    c3: 'rgba(225, 29, 46, 0.35)',
    c4: 'rgba(255, 228, 230, 0.45)',
  },
};

export const GradientBlob: React.FC<GradientBlobProps> = ({
  tone = 'idle',
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 45, stiffness: 60, mass: 1.2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const offsetX = ((e.clientX / innerWidth) - 0.5) * 140;
      const offsetY = ((e.clientY / innerHeight) - 0.5) * 140;
      mouseX.set(offsetX);
      mouseY.set(offsetY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, prefersReduced]);

  const palette = toneGradients[tone] || toneGradients.idle;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] sm:w-[960px] sm:h-[960px] md:w-[1100px] md:h-[1100px] rounded-full will-change-transform"
        style={{
          x: prefersReduced ? 0 : smoothX,
          y: prefersReduced ? 0 : smoothY,
          filter: 'blur(95px)',
          opacity: 0.85,
        }}
        animate={
          prefersReduced
            ? {}
            : {
                scale: [1, 1.06, 0.96, 1],
                rotate: [0, 45, 90, 0],
              }
        }
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-full h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${palette.c1} 0%, ${palette.c2} 35%, ${palette.c3} 60%, ${palette.c4} 85%, transparent 100%)`,
          }}
        />
      </motion.div>

      <motion.div
        className="absolute top-[18%] right-[12%] w-[450px] h-[450px] sm:w-[600px] sm:h-[600px] rounded-full will-change-transform opacity-60"
        style={{
          filter: 'blur(110px)',
          background: `radial-gradient(circle, ${palette.c1} 0%, ${palette.c3} 50%, transparent 80%)`,
        }}
        animate={
          prefersReduced
            ? {}
            : {
                x: [0, -35, 20, 0],
                y: [0, 25, -20, 0],
              }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};
