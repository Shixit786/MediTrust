import React from 'react';
import { GradientBlob } from './GradientBlob';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import type { BlobTone } from '../../types/analysis';

import { useAnalysisStore } from '../../store/useAnalysisStore';
import { DemoConductor } from '../presenter/DemoConductor';
import { ChatWidget } from '../chat/ChatWidget';

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
  const isPresenterActive = useAnalysisStore((s) => s.presenter.active);
  const effectiveTone = blobTone ?? storeTone ?? 'idle';

  return (
    <div className={`relative min-h-screen flex flex-col bg-[#F0F0F0] text-[#0A0A0A] selection:bg-[#0037FF] selection:text-white ${isPresenterActive ? 'pb-28 sm:pb-32' : ''}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0A0A0A] focus:text-white focus:rounded-lg focus:font-mono focus:text-xs"
      >
        Skip to main content
      </a>
      <GradientBlob tone={effectiveTone} />
      <TopBar onShieldClick={onShieldClick} />
      <main id="main-content" className="relative z-10 flex-1 pt-[80px] w-full">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <ChatWidget />
      <DemoConductor />
    </div>
  );
});

PageShell.displayName = 'PageShell';
