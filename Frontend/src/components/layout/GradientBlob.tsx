import React, { useEffect, useRef, useState } from 'react';
import type { BlobTone } from '../../types/analysis';
import { isLowPowerMode, isTouchDevice } from '../../utils/perfGuard';

export interface GradientBlobProps {
  tone?: BlobTone;
  className?: string;
}

const TONES: BlobTone[] = ['idle', 'low', 'medium', 'high', 'critical'];

// Pre-built radial gradients with multiple soft color stops & transparent edges (no blur filters required)
const TONE_GRADIENTS: Record<BlobTone, string> = {
  idle: `
    radial-gradient(ellipse 65% 65% at 36% 36%, rgba(181, 240, 255, 0.75) 0%, rgba(181, 240, 255, 0.40) 40%, rgba(181, 240, 255, 0.12) 65%, transparent 80%),
    radial-gradient(ellipse 60% 60% at 64% 60%, rgba(111, 163, 255, 0.65) 0%, rgba(165, 180, 252, 0.40) 45%, rgba(165, 180, 252, 0.10) 70%, transparent 85%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 55, 255, 0.25) 0%, rgba(0, 55, 255, 0.08) 50%, transparent 75%)
  `,
  low: `
    radial-gradient(ellipse 65% 65% at 36% 36%, rgba(187, 247, 208, 0.75) 0%, rgba(134, 239, 172, 0.40) 40%, rgba(134, 239, 172, 0.12) 65%, transparent 80%),
    radial-gradient(ellipse 60% 60% at 64% 60%, rgba(74, 222, 128, 0.60) 0%, rgba(34, 197, 94, 0.35) 45%, rgba(34, 197, 94, 0.10) 70%, transparent 85%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 197, 94, 0.22) 0%, rgba(34, 197, 94, 0.06) 50%, transparent 75%)
  `,
  medium: `
    radial-gradient(ellipse 65% 65% at 36% 36%, rgba(254, 240, 138, 0.75) 0%, rgba(253, 230, 138, 0.40) 40%, rgba(253, 230, 138, 0.12) 65%, transparent 80%),
    radial-gradient(ellipse 60% 60% at 64% 60%, rgba(251, 191, 36, 0.60) 0%, rgba(245, 158, 11, 0.35) 45%, rgba(245, 158, 11, 0.10) 70%, transparent 85%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.06) 50%, transparent 75%)
  `,
  high: `
    radial-gradient(ellipse 65% 65% at 36% 36%, rgba(254, 215, 170, 0.75) 0%, rgba(255, 237, 213, 0.40) 40%, rgba(255, 237, 213, 0.12) 65%, transparent 80%),
    radial-gradient(ellipse 60% 60% at 64% 60%, rgba(251, 146, 60, 0.60) 0%, rgba(249, 115, 22, 0.35) 45%, rgba(249, 115, 22, 0.10) 70%, transparent 85%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(249, 115, 22, 0.22) 0%, rgba(249, 115, 22, 0.06) 50%, transparent 75%)
  `,
  critical: `
    radial-gradient(ellipse 65% 65% at 36% 36%, rgba(254, 205, 211, 0.80) 0%, rgba(255, 228, 230, 0.40) 40%, rgba(255, 228, 230, 0.12) 65%, transparent 80%),
    radial-gradient(ellipse 60% 60% at 64% 60%, rgba(244, 63, 94, 0.60) 0%, rgba(225, 29, 46, 0.35) 45%, rgba(225, 29, 46, 0.10) 70%, transparent 85%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(225, 29, 46, 0.22) 0%, rgba(225, 29, 46, 0.06) 50%, transparent 75%)
  `,
};

export const GradientBlob: React.FC<GradientBlobProps> = React.memo(({
  tone = 'idle',
  className = '',
}) => {
  const cursorFollowerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lowPower] = useState(() => isLowPowerMode());

  useEffect(() => {
    // Tab visibility handling - pause when tab is hidden
    const handleVisibilityChange = () => {
      setIsPaused(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // If low power or touch device, do not run cursor-follow rAF loop
    if (lowPower || isTouchDevice()) {
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = ((e.clientX / innerWidth) - 0.5) * 110;
      targetY = ((e.clientY / innerHeight) - 0.5) * 110;

      if (!animationFrameId && document.visibilityState !== 'hidden') {
        animationFrameId = requestAnimationFrame(updateSpring);
      }
    };

    const updateSpring = () => {
      // Gentle spring lerp directly modifying element.style.transform without React state
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * 0.045;
      currentY += dy * 0.045;

      if (cursorFollowerRef.current) {
        cursorFollowerRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        animationFrameId = requestAnimationFrame(updateSpring);
      } else {
        animationFrameId = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [lowPower]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{ contain: 'strict' }}
      aria-hidden="true"
    >
      {/* Container for cursor-follow translation (pure rAF translate3d) */}
      <div
        ref={cursorFollowerRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {/* Container for idle drift animation (CSS transform keyframe only) */}
        <div
          className={`relative w-[480px] h-[480px] sm:w-[700px] sm:h-[700px] lg:w-[1020px] lg:h-[1020px] rounded-full will-change-transform ${
            lowPower ? '' : 'blob-drift-anim'
          } ${isPaused ? 'animation-paused' : ''}`}
        >
          {TONES.map((t) => (
            <div
              key={t}
              className="absolute inset-0 rounded-full transition-opacity duration-700 ease-out"
              style={{
                background: TONE_GRADIENTS[t],
                opacity: tone === t ? 0.9 : 0,
                contain: 'paint',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

GradientBlob.displayName = 'GradientBlob';
