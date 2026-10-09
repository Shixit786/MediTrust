import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

export interface HairlineRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  borderTop?: boolean;
  borderBottom?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoverAccentColor?: string; // default soft accent
}

export const HairlineRow: React.FC<HairlineRowProps> = ({
  children,
  borderTop = true,
  borderBottom = true,
  interactive = true,
  className,
  onClick,
  hoverAccentColor = 'rgba(0, 55, 255, 0.06)',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden transition-colors duration-200',
        borderTop && 'border-t border-[#0A0A0A]',
        borderBottom && 'border-b border-[#0A0A0A]',
        interactive && 'cursor-pointer group select-none',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      {...props}
    >
      {/* Background slide-in hover effect */}
      {interactive && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          initial={false}
          animate={{
            scaleX: isHovered ? 1 : 0,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            duration: prefersReduced ? 0.01 : 0.35,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            transformOrigin: 'left center',
            backgroundColor: hoverAccentColor,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-between">
        {children}
      </div>
    </div>
  );
};
