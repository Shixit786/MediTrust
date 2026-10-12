import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import type { HistoryEntry } from '../../types/analysis';

export type HistoryFilter = 'ALL' | 'JOB' | 'VOICE' | 'SIM' | 'FUSION';

interface HistoryStatsProps {
  entries: HistoryEntry[];
  currentFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
}

function getRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

const FILTERS: HistoryFilter[] = ['ALL', 'JOB', 'VOICE', 'SIM', 'FUSION'];

export const HistoryStats: React.FC<HistoryStatsProps> = React.memo(
  ({ entries, currentFilter, onFilterChange }) => {
    const totalCount = entries.length;
    const highOrCriticalCount = entries.filter(
      (e) => e.level === 'high' || e.level === 'critical'
    ).length;
    const lastScanTime = entries.length > 0 ? getRelativeTime(entries[0].timestamp) : '--';

    return (
      <div className="flex flex-col gap-6">
        {/* Three BigNumber Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 sm:p-8 rounded-[20px] bg-white border border-[#0A0A0A]">
          <div className="flex flex-col gap-1">
            <MonoLabel color="muted" className="text-[10px]">
              TOTAL SCANS LOGGED
            </MonoLabel>
            <div className="flex items-baseline gap-2">
              <BigNumber value={totalCount} size="lg" animate={false} />
              <span className="font-mono-label text-xs text-[#6B6F76]">RECORDS</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <MonoLabel color="muted" className="text-[10px]">
              HIGH OR CRITICAL THREATS
            </MonoLabel>
            <div className="flex items-baseline gap-2">
              <BigNumber value={highOrCriticalCount} size="lg" animate={false} />
              <span className="font-mono-label text-xs text-[#E11D2E] font-bold">DETECTED</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <MonoLabel color="muted" className="text-[10px]">
              LAST LOGGED ACTIVITY
            </MonoLabel>
            <span className="font-['Inter_Tight'] text-3xl font-light text-[#0A0A0A] mt-1">
              {lastScanTime}
            </span>
          </div>
        </div>

        {/* Filter Navigation Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 select-none">
          <span className="font-mono-label text-xs text-[#6B6F76] mr-2 shrink-0">
            FILTER VECTOR:
          </span>
          {FILTERS.map((f) => {
            const active = currentFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={`relative px-4 py-2 rounded-xl font-mono-label text-xs font-semibold transition-colors shrink-0 cursor-pointer ${active
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white hover:bg-[#F0F0F0] text-[#0A0A0A] border border-[#0A0A0A]/15'
                  }`}
              >
                <span>{f}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

HistoryStats.displayName = 'HistoryStats';
