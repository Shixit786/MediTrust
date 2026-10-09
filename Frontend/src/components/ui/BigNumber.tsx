import React, { useEffect, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

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

export const BigNumber: React.FC<BigNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  padZero = true,
  animate = true,
  duration = 1.2,
  className,
  size = 'lg',
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReduced = useReducedMotion();
  const numericTarget = typeof value === 'number' ? value : parseInt(value, 10);
  const isNumeric = !isNaN(numericTarget);

  const [displayValue, setDisplayValue] = useState(
    animate && isNumeric && !prefersReduced ? 0 : numericTarget
  );

  useEffect(() => {
    if (!isInView || !animate || !isNumeric || prefersReduced) {
      if (isNumeric) setDisplayValue(numericTarget);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easedProgress * numericTarget);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isInView, animate, isNumeric, numericTarget, duration, prefersReduced]);

  const formatNumber = (val: number | string) => {
    if (typeof val === 'number') {
      if (padZero && val < 10) return `0${val}`;
      return `${val}`;
    }
    return val;
  };

  const sizeClasses = {
    sm: 'text-2xl font-light',
    md: 'text-4xl font-light',
    lg: 'text-6xl sm:text-7xl font-light tracking-tight',
    xl: 'text-7xl sm:text-8xl md:text-9xl font-light tracking-tighter',
    giant: 'text-8xl sm:text-9xl md:text-[140px] font-[250] tracking-tighter leading-none',
  };

  return (
    <span
      ref={ref}
      className={clsx(
        'font-["Inter_Tight"] tabular-nums inline-flex items-baseline text-[#0A0A0A]',
        sizeClasses[size],
        className
      )}
    >
      {prefix && <span className="text-muted mr-1 font-mono-label text-sm tracking-normal">{prefix}</span>}
      <span>{isNumeric ? formatNumber(displayValue) : value}</span>
      {suffix && <span className="text-muted ml-1 text-2xl font-light">{suffix}</span>}
    </span>
  );
};
