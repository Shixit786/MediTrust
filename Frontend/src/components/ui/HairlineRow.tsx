import React from 'react';
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

export const HairlineRow: React.FC<HairlineRowProps> = React.memo(({
  children,
  borderTop = true,
  borderBottom = true,
  interactive = true,
  className,
  onClick,
  hoverAccentColor = 'rgba(0, 55, 255, 0.06)',
  style,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden transition-colors duration-200',
        borderTop && 'border-t border-[#0A0A0A]',
        borderBottom && 'border-b border-[#0A0A0A]',
        interactive && 'hairline-row-hover cursor-pointer group select-none',
        className
      )}
      style={{
        ...style,
        ...(interactive ? ({ '--hover-accent': hoverAccentColor } as React.CSSProperties) : {}),
      }}
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
      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-between">
        {children}
      </div>
    </div>
  );
});

HairlineRow.displayName = 'HairlineRow';
