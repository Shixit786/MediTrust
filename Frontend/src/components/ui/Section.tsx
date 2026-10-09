import React from 'react';
import clsx from 'clsx';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: 'section' | 'div' | 'header' | 'footer' | 'main';
  id?: string;
  fullWidth?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  children,
  className,
  containerClassName,
  as: Component = 'section',
  id,
  fullWidth = false,
  ...props
}) => {
  return (
    <Component
      id={id}
      className={clsx('relative w-full', className)}
      {...props}
    >
      {fullWidth ? (
        children
      ) : (
        <div
          className={clsx(
            'w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14',
            containerClassName
          )}
        >
          {children}
        </div>
      )}
    </Component>
  );
};
