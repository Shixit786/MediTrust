import React from 'react';
import { GradientBlob } from './GradientBlob';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import type { BlobTone } from '../../types/analysis';

import { useAnalysisStore } from '../../store/useAnalysisStore';

export interface PageShellProps {
  children: React.ReactNode;
  blobTone?: BlobTone;
  onShieldClick?: (shieldId: string) => void;
  hideFooter?: boolean;
}

export const PageShell: React.FC<PageShellProps> = React.memo(({
  children,
  blobTone,
  onShieldClick,
  hideFooter = false,
}) => {
  const storeTone = useAnalysisStore((s) => s.blobTone);
  const effectiveTone = blobTone ?? storeTone ?? 'idle';

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F0F0F0] text-[#0A0A0A] selection:bg-[#0037FF] selection:text-white">
      <GradientBlob tone={effectiveTone} />
      <TopBar onShieldClick={onShieldClick} />
      <main className="relative z-10 flex-1 pt-[80px] w-full">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
});

PageShell.displayName = 'PageShell';
