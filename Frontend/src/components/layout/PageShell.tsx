import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { GradientBlob } from './GradientBlob';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import type { BlobTone } from '../../types/analysis';

export interface PageShellProps {
  children: React.ReactNode;
  blobTone?: BlobTone;
  onShieldClick?: (shieldId: string) => void;
  hideFooter?: boolean;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  blobTone = 'idle',
  onShieldClick,
  hideFooter = false,
}) => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F0F0F0] text-[#0A0A0A] selection:bg-[#0037FF] selection:text-white">
      <GradientBlob tone={blobTone} />
      <TopBar onShieldClick={onShieldClick} />
      <main className="relative z-10 flex-1 pt-[80px] w-full">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};
