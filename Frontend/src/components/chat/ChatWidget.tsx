import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAnalysisStore } from '../../store/useAnalysisStore';

// Lazy-import the ChatPanel chunk
const LazyChatPanel = React.lazy(() =>
  import('./ChatPanel').then((mod) => ({ default: mod.ChatPanel }))
);

export const ChatWidget: React.FC = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const location = useLocation();
  const isPrintPage = location.pathname === '/print';
  const isPresenterActive = useAnalysisStore((s) => s.presenter.active);
  const isMenuOpen = useAnalysisStore((s) => s.isMenuOpen);

  // VITE_CHAT_ENABLED toggle (default true)
  const isEnabled = import.meta.env.VITE_CHAT_ENABLED !== 'false';

  // Prefetch ChatPanel on requestIdleCallback or timer
  useEffect(() => {
    if (!isEnabled || isPrintPage) return;

    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const prefetch = () => {
      // Trigger dynamic import chunk download
      import('./ChatPanel').catch(() => {});
    };

    const win = typeof window !== 'undefined' ? (window as unknown as Window & {
      requestIdleCallback?: (cb: () => void, opt?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }) : undefined;

    if (win?.requestIdleCallback) {
      idleId = win.requestIdleCallback(prefetch, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(prefetch, 2000);
    }

    return () => {
      if (idleId && win?.cancelIdleCallback) {
        win.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isEnabled, isPrintPage]);

  // Return focus to launcher when panel closes
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      // Panel just closed
      const t = setTimeout(() => {
        launcherRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Strict visibility guards:
  // 1. VITE_CHAT_ENABLED must be true
  // 2. Hide on /print
  // 3. Hide while full-screen menu overlay is open
  // 4. Hide while Presenter mode is active
  if (!isEnabled || isPrintPage || isMenuOpen || isPresenterActive) {
    return null;
  }

  return (
    <div
      className="fixed right-5 sm:right-6 z-40"
      style={{
        bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))',
      }}
    >
      {/* 1) Launcher Button (hidden when panel is open) */}
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          onClick={handleOpen}
          aria-label="Open MediTrust assistant chatbot"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-[#0A0A0A] text-white border border-[#0A0A0A] transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 active:translate-y-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] select-none"
          style={{
            boxShadow: 'none',
          }}
        >
          <span className="font-mono-label text-xs font-bold tracking-wider text-white">
            ASK
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-white/80 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      )}

      {/* 2) Lazy-loaded ChatPanel */}
      {isOpen && (
        <Suspense fallback={null}>
          <LazyChatPanel isOpen={isOpen} onClose={handleClose} />
        </Suspense>
      )}
    </div>
  );
});

ChatWidget.displayName = 'ChatWidget';
