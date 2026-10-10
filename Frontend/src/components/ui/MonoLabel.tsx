import React from 'react';
import clsx from 'clsx';

export interface MonoLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'ink' | 'muted' | 'accent' | 'subtle';
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'h4';
}

const colorMap = {
  ink: 'text-[#0A0A0A]',
  muted: 'text-[#6B6F76]',
  accent: 'text-[#0037FF]',
  subtle: 'text-[#0A0A0A]/60',
};

export const MonoLabel: React.FC<MonoLabelProps> = React.memo(({
  color = 'muted',
  children,
  className,
  as: Component = 'span',
  ...props
}) => {
  return (
    <Component
      className={clsx(
        'font-mono-label inline-flex items-center tracking-[0.08em] select-none font-medium',
        colorMap[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

MonoLabel.displayName = 'MonoLabel';
