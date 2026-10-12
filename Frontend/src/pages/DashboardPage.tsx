import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ShieldStatusCards } from '../components/dashboard/ShieldStatusCards';
import { DemoControlsBar } from '../components/dashboard/DemoControlsBar';
import { LiveThreatStream } from '../components/dashboard/LiveThreatStream';
import { FusionMiniSummary } from '../components/dashboard/FusionMiniSummary';
import { SafeNextStepCard } from '../components/dashboard/SafeNextStepCard';
import { HairlineRow } from '../components/ui/HairlineRow';
import { MonoLabel } from '../components/ui/MonoLabel';

export const DashboardPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const fusionResult = useAnalysisStore((s) => s.fusionResult);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const startPresenter = useAnalysisStore((s) => s.startPresenter);

  // Reset blob tone to idle on unmount
  useEffect(() => {
    return () => {
      setBlobTone('idle');
    };
  }, [setBlobTone]);

  const hasFusionResult = !!fusionResult;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
      {/* 1) Header */}
      <DashboardHeader />

      {/* 2) Three Shield Status Cards */}
      <section aria-label="Shield Security Statuses">
        <ShieldStatusCards />
      </section>

      {/* 2b) Guided Presenter Mode Row */}
      <HairlineRow
        className="py-4 px-4 sm:px-6"
        onClick={() => {
          startPresenter();
          navigate('/job?demo=1');
        }}
      >
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent">GUIDED EVALUATION</MonoLabel>
            <span className="text-xs font-mono text-[#6B6F76]">· 5-STAGE ATTACK CHAIN</span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono-label text-xs sm:text-sm font-semibold text-[#0037FF] group-hover:underline">
            <span>START PRESENTER MODE</span>
            <span className="font-sans">↗</span>
          </span>
        </div>
      </HairlineRow>

      {/* 3) Run Demo Attack full-width row */}
      <section aria-label="Attack Chain Simulation Controls">
        <DemoControlsBar />
      </section>

      {/* 4 & 5) Live Threat Stream + Fusion Mini Summary (Two-Column Layout) */}
      <section
        aria-label="Real-time Telemetry and Fusion Analysis"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left column: Live Threat Stream (Wide) */}
        <div className="lg:col-span-7 xl:col-span-8 w-full">
          <LiveThreatStream />
        </div>

        {/* Right column: Fusion Mini Summary */}
        <div className="lg:col-span-5 xl:col-span-4 w-full">
          <FusionMiniSummary />
        </div>
      </section>

      {/* 6) Safe Next Step Strip (Appears upon Fusion verdict) */}
      {hasFusionResult && (
        <section aria-label="Incident Remediation and Advisory" className="flex flex-col gap-8">
          <SafeNextStepCard />
        </section>
      )}
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';
