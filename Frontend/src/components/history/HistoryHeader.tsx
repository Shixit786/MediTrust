import React, { useState } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { Trash2 } from 'lucide-react';

interface HistoryHeaderProps {
  onClearHistory: () => void;
  hasEntries: boolean;
  isStorageAvailable: boolean;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = React.memo(
  ({ onClearHistory, hasEntries, isStorageAvailable }) => {
    const [confirming, setConfirming] = useState<boolean>(false);

    const handleConfirm = () => {
      onClearHistory();
      setConfirming(false);
    };

    return (
      <header className="flex flex-col gap-6 pt-4 pb-8 border-b border-[#0A0A0A]">
        {/* Category Label + Storage Tag */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
              SCAN HISTORY
            </MonoLabel>

            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#0A0A0A]/20 font-mono-label text-[10px] text-[#0A0A0A] font-semibold">
              STORED ONLY IN THIS BROWSER
            </span>
          </div>

          {/* Delete All History Action with Inline Confirmation */}
          {hasEntries && (
            <div className="flex items-center gap-3">
              {confirming ? (
                <div className="flex items-center gap-3 bg-[#E11D2E]/10 border border-[#E11D2E]/30 px-3 py-1.5 rounded-xl">
                  <span className="font-mono-label text-xs text-[#E11D2E] font-bold">
                    DELETE ALL AUDIT LOGS?
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="font-mono-label text-xs font-bold text-[#E11D2E] hover:underline cursor-pointer"
                  >
                    CONFIRM DELETE
                  </button>
                  <span className="text-[#E11D2E]/40">/</span>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="font-mono-label text-xs font-medium text-[#6B6F76] hover:text-[#0A0A0A] cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="font-mono-label text-xs text-[#6B6F76] hover:text-[#E11D2E] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE ALL HISTORY</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none">
          <RevealText delay={0.05}>History</RevealText>
        </h1>

        {/* Editorial Subtitle */}
        <p className="text-lg sm:text-xl text-[#6B6F76] font-light max-w-3xl leading-relaxed">
          Your recent scans. Stored only in this browser. Summaries only, never your messages or audio.
        </p>

        {!isStorageAvailable && (
          <div className="p-3 rounded-xl bg-[#F5B800]/15 border border-[#F5B800]/40 font-mono-label text-xs text-[#B45309]">
            History cannot be saved in this browser session (storage unavailable or private browsing mode active).
          </div>
        )}
      </header>
    );
  }
);

HistoryHeader.displayName = 'HistoryHeader';
