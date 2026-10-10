import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface ArrowLinkProps {
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  arrowClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showArrow?: boolean;
}

const sizeClasses = {
  sm: 'text-sm font-semibold tracking-wider gap-1.5',
  md: 'text-base sm:text-lg font-semibold tracking-wider gap-2',
  lg: 'text-xl sm:text-2xl font-medium tracking-wide gap-3',
  hero: 'text-lg sm:text-2xl md:text-3xl font-normal tracking-tight gap-3',
};

const arrowSizeClasses = {
  sm: 'text-base',
  md: 'text-lg sm:text-xl',
  lg: 'text-2xl',
  hero: 'text-2xl sm:text-3xl',
};

export const ArrowLink: React.FC<ArrowLinkProps> = React.memo(({
  to,
  href,
  onClick,
  children,
  className,
  arrowClassName,
  size = 'md',
  showArrow = true,
}) => {
  const content = (
    <span className={clsx(
      'group/arrow inline-flex items-center text-[#0037FF] font-["Inter_Tight"] uppercase transition-colors duration-200 select-none',
      sizeClasses[size],
      className
    )}>
      <span className="relative">
        {children}
        <span className="absolute left-0 -bottom-0.5 w-0 h-[1px] bg-[#0037FF] transition-all duration-300 group-hover/arrow:w-full" />
      </span>
      {showArrow && (
        <span
          className={clsx(
            'inline-block font-sans font-light leading-none transition-transform duration-200 group-hover/arrow:translate-x-0.5 group-hover/arrow:-translate-y-0.5',
            arrowSizeClasses[size],
            arrowClassName
          )}
        >
          ↗
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-sm">
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} onClick={onClick} target="_blank" rel="noopener noreferrer" className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-sm">
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block bg-transparent border-none p-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-sm"
    >
      {content}
    </button>
  );
});

ArrowLink.displayName = 'ArrowLink';
