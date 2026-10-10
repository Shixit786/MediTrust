import React, { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { isLowTierHardware } from '../../utils/perfGuard';

export interface RevealTextProps {
  children: string | string[];
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  splitBy?: 'lines' | 'words' | 'none';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';
}

const lineVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: (duration: number) => ({
    y: '0%',
    opacity: 1,
    transition: {
      duration,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const RevealText: React.FC<RevealTextProps> = React.memo(({
  children,
  className,
  delay = 0.1,
  stagger = 0.12,
  duration = 0.8,
  splitBy = 'lines',
  as: Component = 'div',
}) => {
  const prefersReduced = useReducedMotion();
  const isLowTier = isLowTierHardware();

  const items: string[] = useMemo(() => {
    if (Array.isArray(children)) return children;
    if (splitBy === 'lines') return children.split('\n');
    if (splitBy === 'words') return children.split(' ');
    return [children];
  }, [children, splitBy]);

  if (prefersReduced || isLowTier) {
    return (
      <Component className={className}>
        {items.map((item, idx) => (
          <span key={idx} className={splitBy === 'lines' ? 'block' : 'inline-block mr-2'}>
            {item}
          </span>
        ))}
      </Component>
    );
  }

  return (
    <Component className={clsx('overflow-hidden', className)}>
      <motion.span
        className="block"
        initial="hidden"
        animate="visible"
        transition={{
          staggerChildren: stagger,
          delayChildren: delay,
        }}
      >
        {items.map((item, index) => (
          <span
            key={index}
            className={clsx(
              'overflow-hidden align-top',
              splitBy === 'lines' ? 'block' : 'inline-block mr-[0.25em]'
            )}
          >
            <motion.span
              custom={duration}
              variants={lineVariants}
              className="block will-change-transform"
            >
              {item}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Component>
  );
});

RevealText.displayName = 'RevealText';
