import React, { useRef, useState } from 'react';
import { motion, useSpring, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  to?: string;
  href?: string;
  className?: string;
  ariaLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  onClick,
  to,
  href,
  className,
  ariaLabel,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  const springConfig = { damping: 15, stiffness: 180, mass: 0.1 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Limit displacement (magnetic pull)
    const distanceX = (e.clientX - centerX) * 0.25;
    const distanceY = (e.clientY - centerY) * 0.25;
    x.set(distanceX);
    y.set(distanceY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs rounded-[14px]',
    md: 'px-6 py-3 text-sm rounded-[16px]',
    lg: 'px-8 py-4 text-base rounded-[18px]',
    icon: 'w-14 h-14 p-0 rounded-[16px] flex items-center justify-center',
  };

  const variantClasses = {
    primary: 'bg-[#0A0A0A] text-white hover:bg-[#1C1C1C]',
    secondary: 'bg-[#0037FF] text-white hover:bg-[#002ED6]',
    ghost: 'bg-white/80 text-[#0A0A0A] border border-[#0A0A0A] hover:bg-white',
    icon: 'bg-[#0A0A0A] text-white hover:bg-[#1E1E1E]',
  };

  const buttonContent = (
    <motion.div
      ref={ref}
      style={prefersReduced ? {} : { x, y }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={clsx(
        'relative inline-flex items-center justify-center font-["Inter_Tight"] font-medium tracking-wide select-none transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.97]',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      {/* Subtle shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-white/10 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.div>
  );

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-[16px]">
        {buttonContent}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer" className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-[16px]">
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-block bg-transparent border-none p-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-[16px]"
    >
      {buttonContent}
    </button>
  );
};
