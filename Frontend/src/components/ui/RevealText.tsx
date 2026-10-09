import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

export interface RevealTextProps {
  children: string | string[];
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  splitBy?: 'lines' | 'words' | 'none';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';
}

export const RevealText: React.FC<RevealTextProps> = ({
  children,
  className,
  delay = 0.1,
  stagger = 0.12,
  duration = 0.8,
  splitBy = 'lines',
  as: Component = 'div',
}) => {
  const prefersReduced = useReducedMotion();

  const items: string[] = Array.isArray(children)
    ? children
    : splitBy === 'lines'
    ? children.split('\n')
    : splitBy === 'words'
    ? children.split(' ')
    : [children];

  if (prefersReduced) {
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
            style={{ perspective: 1000 }}
          >
            <motion.span
              variants={{
                hidden: {
                  y: '105%',
                  opacity: 0,
                  rotateX: -10,
                },
                visible: {
                  y: '0%',
                  opacity: 1,
                  rotateX: 0,
                  transition: {
                    duration,
                    ease: 'easeOut',
                  },
                },
              }}
              className="block will-change-transform transform-gpu"
            >
              {item}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Component>
  );
};
