import React, { useEffect, useRef } from 'react';
import { useInView, useReducedMotion, useMotionValue, animate as fmAnimate } from 'framer-motion';
import clsx from 'clsx';
import { isLowTierHardware } from '../../utils/perfGuard';

export interface BigNumberProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  padZero?: boolean;
  animate?: boolean;
  duration?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
}

const sizeClasses = {
  sm: 'text-2xl font-light',
  md: 'text-4xl font-light',
  lg: 'text-6xl sm:text-7xl font-light tracking-tight',
  xl: 'text-7xl sm:text-8xl md:text-9xl font-light tracking-tighter',
  giant: 'text-8xl sm:text-9xl md:text-[140px] font-[250] tracking-tighter leading-none',
};

function formatNumber(val: number, padZero: boolean) {
  if (padZero && val < 10 && val >= 0) return `0${val}`;
  return `${val}`;
}

export const BigNumber: React.FC<BigNumberProps> = React.memo(({
  value,
  prefix = '',
  suffix = '',
  padZero = true,
  animate = true,
  duration = 1.2,
  className,
  size = 'lg',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const numberNodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();
  const isLowTier = isLowTierHardware();

  const numericTarget = typeof value === 'number' ? value : parseInt(value, 10);
  const isNumeric = !isNaN(numericTarget);

  const motionVal = useMotionValue(animate && isNumeric && !prefersReduced && !isLowTier ? 0 : numericTarget);

  useEffect(() => {
    if (!numberNodeRef.current) return;

    if (!isNumeric || !animate || prefersReduced || isLowTier) {
      numberNodeRef.current.textContent = isNumeric ? formatNumber(numericTarget, padZero) : `${value}`;
      return;
    }

    if (!isInView) return;

    const controls = fmAnimate(motionVal, numericTarget, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (numberNodeRef.current) {
          numberNodeRef.current.textContent = formatNumber(Math.round(latest), padZero);
        }
      },
    });

    return () => controls.stop();
  }, [isInView, animate, isNumeric, numericTarget, duration, prefersReduced, isLowTier, value, padZero, motionVal]);

  const initialRender = isNumeric
    ? (animate && !prefersReduced && !isLowTier ? formatNumber(0, padZero) : formatNumber(numericTarget, padZero))
    : `${value}`;

  return (
    <span
      ref={containerRef}
      className={clsx(
        'font-["Inter_Tight"] tabular-nums inline-flex items-baseline text-[#0A0A0A]',
        sizeClasses[size],
        className
      )}
    >
      {prefix && <span className="text-muted mr-1 font-mono-label text-sm tracking-normal">{prefix}</span>}
      <span ref={numberNodeRef}>{initialRender}</span>
      {suffix && <span className="text-muted ml-1 text-2xl font-light">{suffix}</span>}
    </span>
  );
});

BigNumber.displayName = 'BigNumber';
