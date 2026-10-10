import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { ArrowLink } from '../ui/ArrowLink';
import type { HistoryEntry, RiskLevel } from '../../types/analysis';

interface HistoryListProps {
  entries: HistoryEntry[];
  onLoadDemoScenario: () => void;
}

const SHIELD_STYLES: Record<string, { label: string; dot: string; route: string }> = {
  job: { label: 'job·shield', dot: '#F5B800', route: '/job' },
  voice: { label: 'voice·shield', dot: '#3B5BFF', route: '/voice' },
  sim: { label: 'sim·guard', dot: '#FF4FA3', route: '/sim' },
  fusion: { label: 'fusion·engine', dot: '#0037FF', route: '/fusion' },
};

const LEVEL_BADGES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-[#E11D2E]/10', text: 'text-[#E11D2E]', border: 'border-[#E11D2E]/30' },
  high: { bg: 'bg-[#EA580C]/10', text: 'text-[#EA580C]', border: 'border-[#EA580C]/30' },
  medium: { bg: 'bg-[#F5B800]/15', text: 'text-[#B45309]', border: 'border-[#F5B800]/30' },
  low: { bg: 'bg-[#16A34A]/10', text: 'text-[#16A34A]', border: 'border-[#16A34A]/30' },
};

const PAGE_CHUNK = 50;

export const HistoryList: React.FC<HistoryListProps> = React.memo(
  ({ entries, onLoadDemoScenario }) => {
    const [visibleCount, setVisibleCount] = useState<number>(PAGE_CHUNK);

    const visibleEntries = entries.slice(0, visibleCount);
    const hasMore = entries.length > visibleCount;

    if (entries.length === 0) {
      return (
        <div className="p-8 sm:p-12 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6B6F76]" />
            <MonoLabel color="muted" className="text-xs font-semibold tracking-widest">
              NO SCANS YET
            </MonoLabel>
          </div>

          <h3 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-[#0A0A0A] max-w-md">
            No threat scans recorded in this browser session.
          </h3>

          <p className="font-['Inter_Tight'] text-sm text-[#6B6F76] max-w-md">
            Run an analysis on any of our threat defense shields, or load a simulated multi-vector
            attack chain scenario to see audit logs populate.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={onLoadDemoScenario}
              className="px-5 py-2.5 rounded-xl bg-[#0037FF] hover:bg-[#0030E0] text-white font-mono-label text-xs font-semibold cursor-pointer transition-colors"
            >
              LOAD DEMO SCENARIO ↗
            </button>
            <ArrowLink to="/dashboard" size="sm">
              GO TO DASHBOARD
            </ArrowLink>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10">
          <MonoLabel color="muted">LOGGED AUDIT ENTRIES</MonoLabel>
          <span className="font-mono-label text-xs text-[#6B6F76]">
            SHOWING {visibleEntries.length} OF {entries.length} SCANS
          </span>
        </div>

        {/* Hairline rows list */}
        <div className="flex flex-col bg-white rounded-[20px] border border-[#0A0A0A] overflow-hidden">
          {visibleEntries.map((entry, idx) => {
            const meta = SHIELD_STYLES[entry.shield] || SHIELD_STYLES.fusion;
            const badge = LEVEL_BADGES[entry.level] || LEVEL_BADGES.low;

            return (
              <HairlineRow
                key={entry.id}
                borderTop={idx > 0}
                borderBottom={false}
                interactive={false}
                className="py-4 px-4 sm:px-6 min-h-[72px]"
              >
                <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-text">
                  {/* Left: Timestamp + Shield indicator */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <span className="font-mono-label text-xs text-[#6B6F76] w-18 shrink-0">
                      {entry.timeFormatted}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.dot }}
                      />
                      <span className="font-['Inter_Tight'] font-medium text-sm text-[#0A0A0A]">
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Threat / Pattern label + One-line summary */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden">
                    <span className="font-['Inter_Tight'] text-sm font-semibold text-[#0A0A0A] shrink-0">
                      {entry.threat}
                    </span>
                    <span className="font-['Inter_Tight'] text-xs text-[#6B6F76] truncate hidden md:inline-block">
                      {entry.summary}
                    </span>
                  </div>

                  {/* Right: Risk score + Level badge + Link */}
                  <div className="flex items-center gap-4 justify-between lg:justify-end shrink-0">
                    <div className="flex items-baseline gap-1 font-mono-label text-xs">
                      <strong className="text-sm font-bold text-[#0A0A0A]">{entry.risk}</strong>
                      <span className="text-[#6B6F76]">/100</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded border font-mono-label text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {entry.level.toUpperCase()}
                    </span>

                    <Link
                      to={meta.route}
                      className="font-mono-label text-xs text-[#0037FF] hover:underline shrink-0 ml-2"
                    >
                      VIEW ↗
                    </Link>
                  </div>
                </div>
              </HairlineRow>
            );
          })}
        </div>

        {/* Show Older Button if capped */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_CHUNK)}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-[#F0F0F0] border border-[#0A0A0A] text-[#0A0A0A] font-mono-label text-xs font-semibold transition-colors cursor-pointer"
            >
              SHOW OLDER ENTRIES
            </button>
          </div>
        )}
      </div>
    );
  }
);

HistoryList.displayName = 'HistoryList';
