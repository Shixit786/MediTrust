import React from 'react';

export const RouteLoadingFallback: React.FC = React.memo(() => {
  return (
    <div
      role="progressbar"
      aria-label="Loading page content"
      className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-transparent overflow-hidden pointer-events-none"
    >
      <div
        className="h-full bg-[#0037FF] w-full origin-left"
        style={{
          animation: 'routeProgress 1.2s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
      <style>{`
        @keyframes routeProgress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
});

RouteLoadingFallback.displayName = 'RouteLoadingFallback';
