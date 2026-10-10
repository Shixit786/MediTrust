import React, { useState, useMemo } from 'react';
import { useHistory } from '../services/history';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { FUSION_SCENARIOS } from '../services/mocks/fusionScenarios';
import { HistoryHeader } from '../components/history/HistoryHeader';
import { HistoryStats, type HistoryFilter } from '../components/history/HistoryStats';
import { HistoryList } from '../components/history/HistoryList';

export const HistoryPage: React.FC = React.memo(() => {
  const { entries, clearHistory, isStorageAvailable } = useHistory();
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const setShieldResultsMap = useAnalysisStore((s) => s.setShieldResultsMap);

  const filteredEntries = useMemo(() => {
    if (filter === 'ALL') return entries;
    return entries.filter((e) => e.shield.toUpperCase() === filter);
  }, [entries, filter]);

  const handleLoadDemoScenario = () => {
    const fullChain = FUSION_SCENARIOS.FULL_ATTACK_CHAIN;
    if (fullChain) {
      setShieldResultsMap(fullChain.results);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
      {/* 1) Header */}
      <HistoryHeader
        onClearHistory={clearHistory}
        hasEntries={entries.length > 0}
        isStorageAvailable={isStorageAvailable}
      />

      {/* 2) Filter and Statistics Strip */}
      <section aria-label="History Statistics and Vector Filter">
        <HistoryStats
          entries={entries}
          currentFilter={filter}
          onFilterChange={setFilter}
        />
      </section>

      {/* 3) Filtered Audit List */}
      <section aria-label="Audit Log Entries">
        <HistoryList
          entries={filteredEntries}
          onLoadDemoScenario={handleLoadDemoScenario}
        />
      </section>
    </div>
  );
});

HistoryPage.displayName = 'HistoryPage';
