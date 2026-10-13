import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { evaluateFusion as calculateFusionRules } from '../services/fusionRules';
import {
  runDemoAttack,
  cancelDemoAttack,
  resetDemoAttackSequence,
  skipDemoAttackToResult,
} from '../services/demoAttack';
import type { ShieldId, ShieldResult } from '../types/analysis';

import { FusionHeader } from '../components/fusion/FusionHeader';
import { FusionSignalCards } from '../components/fusion/FusionSignalCards';
import { FusionCorrelationView } from '../components/fusion/FusionCorrelationView';
import { FusionVerdictCard } from '../components/fusion/FusionVerdictCard';
import { FusionContributions } from '../components/fusion/FusionContributions';
import { FusionAttackChain } from '../components/fusion/FusionAttackChain';
import { FusionCorrelations } from '../components/fusion/FusionCorrelations';
import { FusionAiReport } from '../components/fusion/FusionAiReport';
import { FusionResponseCard } from '../components/fusion/FusionResponseCard';
import { MonoLabel } from '../components/ui/MonoLabel';
import { Shield, Play, Check, RotateCcw } from 'lucide-react';

const DEMO_STAGES = [
  { id: 1, stepNum: '01', label: 'FAKE JOB OFFER' },
  { id: 2, stepNum: '02', label: 'SUSPICIOUS VOICE CALL' },
  { id: 3, stepNum: '03', label: 'SIM-SWAP SIMULATION' },
  { id: 4, stepNum: '04', label: 'FUSION ENGINE' },
];

export const FusionEnginePage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoConfirm, setShowDemoConfirm] = useState<boolean>(false);

  const shieldResults = useAnalysisStore((s) => s.shieldResults);
  const realShieldBackup = useAnalysisStore((s) => s.realShieldBackup);
  const fusionResult = useAnalysisStore((s) => s.fusionResult);
  const setFusionResult = useAnalysisStore((s) => s.setFusionResult);
  const clearAllShields = useAnalysisStore((s) => s.clearAllShields);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);

  const demoAttackStage = useAnalysisStore((s) => s.demoAttackStage);
  const demoAttackProgress = useAnalysisStore((s) => s.demoAttackProgress);
  const isDemoAttackRunning = useAnalysisStore((s) => s.isDemoAttackRunning);

  const hasAutoRunRef = useRef(false);

  // Reset blobTone to idle on unmount and cancel running demo attack
  useEffect(() => {
    return () => {
      cancelDemoAttack();
      setBlobTone('idle');
    };
  }, [setBlobTone]);

  // Demo mode support: ?demo=1 runs demo attack sequence
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAutoRunRef.current) {
      hasAutoRunRef.current = true;
      runDemoAttack({ speed: 1.5 });
    }
  }, [searchParams]);

  const hasRealShields = Boolean(
    (shieldResults.job && shieldResults.job._source !== 'demo') ||
    (shieldResults.voice && shieldResults.voice._source !== 'demo') ||
    (shieldResults.sim && shieldResults.sim._source !== 'demo') ||
    (realShieldBackup && Object.values(realShieldBackup).some((r) => r && r._source !== 'demo'))
  );

  const hasLiveResultsNow = Boolean(
    (shieldResults.job && shieldResults.job._source !== 'demo') ||
    (shieldResults.voice && shieldResults.voice._source !== 'demo') ||
    (shieldResults.sim && shieldResults.sim._source !== 'demo')
  );

  const handleStartDemoAttack = useCallback(() => {
    if (isDemoAttackRunning) return;
    if (hasLiveResultsNow) {
      setShowDemoConfirm(true);
      return;
    }
    setShowDemoConfirm(false);
    runDemoAttack({ speed: 1.0 });
  }, [isDemoAttackRunning, hasLiveResultsNow]);

  const handleConfirmDemoAttack = useCallback(() => {
    setShowDemoConfirm(false);
    runDemoAttack({ speed: 1.0 });
  }, []);

  const handleCancelDemoConfirm = useCallback(() => {
    setShowDemoConfirm(false);
  }, []);

  const handleSkipDemo = useCallback(() => {
    skipDemoAttackToResult();
  }, []);

  const handleReplayDemo = useCallback(() => {
    runDemoAttack({ speed: 1.0 });
  }, []);

  const handleResetDemo = useCallback(() => {
    resetDemoAttackSequence();
    setErrorMessage(null);
  }, []);

  // Execute fusion with real shield results (local rules engine)
  const handleUseMyRealResults = useCallback(() => {
    cancelDemoAttack();
    setErrorMessage(null);

    const store = useAnalysisStore.getState();
    if (store.realShieldBackup && Object.keys(store.realShieldBackup).length > 0) {
      store.restoreRealShields();
    }

    const currentShields = useAnalysisStore.getState().shieldResults;
    const realInputs: Partial<Record<ShieldId, ShieldResult>> = {};

    if (currentShields.job && currentShields.job._source !== 'demo') {
      realInputs.job = currentShields.job;
    }
    if (currentShields.voice && currentShields.voice._source !== 'demo') {
      realInputs.voice = currentShields.voice;
    }
    if (currentShields.sim && currentShields.sim._source !== 'demo') {
      realInputs.sim = currentShields.sim;
    }

    if (!realInputs.job && !realInputs.voice && !realInputs.sim) {
      setErrorMessage('No live shield scans found. Run a live Job, Voice, or SIM scan first.');
      return;
    }

    setIsLoading(true);
    try {
      const res = calculateFusionRules(realInputs);
      (res as { _source?: string })._source = 'live';
      setFusionResult(res);
      setBlobTone(res.level);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to correlate real scan results.');
    } finally {
      setIsLoading(false);
    }
  }, [setBlobTone, setFusionResult]);

  // Run fusion from input cards (uses currently loaded shields, real or scenario)
  const handleRunFusion = useCallback(() => {
    setErrorMessage(null);
    const currentShields = useAnalysisStore.getState().shieldResults;

    if (!currentShields.job && !currentShields.voice && !currentShields.sim) {
      setErrorMessage('Select a scenario or run at least one shield scan first.');
      return;
    }

    setIsLoading(true);
    try {
      const res = calculateFusionRules(currentShields);
      setFusionResult(res);
      setBlobTone(res.level);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Correlation error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [setBlobTone, setFusionResult]);

  const handleClearAll = useCallback(() => {
    cancelDemoAttack();
    setIsLoading(false);
    clearAllShields();
    setErrorMessage(null);
  }, [clearAllShields]);

  const handleRunAgain = useCallback(() => {
    setFusionResult(null);
    handleRunFusion();
  }, [setFusionResult, handleRunFusion]);

  const hasAnyShieldResult = Boolean(shieldResults.job || shieldResults.voice || shieldResults.sim);
  const isDemoActive = isDemoAttackRunning || demoAttackStage > 0;
  const isDemoResult = fusionResult && (fusionResult as { _source?: string })._source === 'demo';

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col gap-10 sm:gap-14">
      {/* 1) Page Header */}
      <FusionHeader showBackToDashboard={true} />

      {/* 2) Top Controls Bar: RUN DEMO ATTACK & USE MY REAL RESULTS */}
      <section aria-label="Fusion Controls and Modes" className="w-full">
        <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <MonoLabel color="ink" className="text-xs font-semibold">
                  FUSION CONTROLS // ATTACK CORRELATION
                </MonoLabel>
                {isDemoActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
                    DEMO SCENARIO · SIMULATED INPUTS
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B6F76]">
                Simulate a coordinated multi-stage threat vector, or correlate your real scan telemetry.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* RUN DEMO ATTACK Button */}
              <button
                type="button"
                onClick={handleStartDemoAttack}
                disabled={isDemoAttackRunning}
                className="px-5 py-2.5 rounded-xl bg-[#0037FF] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#0030E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isDemoAttackRunning ? 'ATTACK IN PROGRESS...' : 'RUN DEMO ATTACK'}</span>
              </button>

              {/* USE MY REAL RESULTS Button */}
              <button
                type="button"
                onClick={handleUseMyRealResults}
                disabled={!hasRealShields || isDemoAttackRunning}
                title={hasRealShields ? 'Correlate real scan telemetry' : 'Run a live Job, Voice, or SIM scan first'}
                className="px-5 py-2.5 rounded-xl border border-[#0A0A0A] text-[#0A0A0A] text-xs font-mono font-semibold tracking-wider hover:bg-[#0A0A0A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#0A0A0A] disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                USE MY REAL RESULTS
              </button>
            </div>
          </div>

          {!hasRealShields && (
            <div className="text-[11px] font-mono-label text-[#6B6F76] border-t border-[#0A0A0A]/10 pt-2">
              No live scans recorded yet. Run a live Job, Voice, or SIM scan first to correlate real threats.
            </div>
          )}

          {/* Inline Confirmation when replacing real scan results */}
          {showDemoConfirm && (
            <div className="mt-2 p-4 rounded-xl bg-[#F5B800]/15 border border-[#F5B800]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <span className="text-[#0A0A0A] font-semibold">
                This replaces your current results with a demo attack scenario. Continue?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDemoAttack}
                  className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white text-xs font-bold hover:bg-[#202020] cursor-pointer"
                >
                  CONTINUE
                </button>
                <button
                  type="button"
                  onClick={handleCancelDemoConfirm}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#0A0A0A]/20 text-[#0A0A0A] text-xs font-semibold hover:bg-[#F0F0F0] cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3) Demo Attack Timeline Header (Visible when demo attack is active or completed) */}
      {isDemoActive && (
        <section
          role="region"
          aria-label="Demo Attack Simulation Timeline"
          className="w-full bg-[#0A0A0A] text-white rounded-[20px] p-6 sm:p-8 flex flex-col gap-6"
        >
          {/* Screen reader announcement */}
          <div className="sr-only" aria-live="polite">
            {`Demo Attack Stage: ${
              demoAttackStage <= 4
                ? DEMO_STAGES[demoAttackStage - 1]?.label || 'Starting'
                : 'Incident Synthesized'
            }`}
          </div>

          {/* Top Info Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/15">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isDemoAttackRunning ? 'bg-[#0037FF] animate-pulse' : 'bg-[#10B981]'
                }`}
              />
              <span className="font-mono-label text-xs sm:text-sm font-bold tracking-widest text-white">
                {isDemoAttackRunning ? 'DEMO ATTACK IN PROGRESS' : 'DEMO ATTACK COMPLETED'}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                DEMO SCENARIO · SIMULATED INPUTS
              </span>
            </div>

            <div className="flex items-center gap-4">
              {isDemoAttackRunning && (
                <button
                  type="button"
                  onClick={handleSkipDemo}
                  className="font-mono-label text-xs text-[#6FA3FF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  SKIP TO RESULT ↗
                </button>
              )}
              {!isDemoAttackRunning && demoAttackStage >= 5 && (
                <>
                  <button
                    type="button"
                    onClick={handleReplayDemo}
                    className="font-mono-label text-xs text-[#6FA3FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>REPLAY DEMO</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="font-mono-label text-xs text-white/60 hover:text-white hover:underline cursor-pointer"
                  >
                    RESET
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4 Stage Chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEMO_STAGES.map((st) => {
              const isCurrent = demoAttackStage === st.id;
              const isCompleted = demoAttackStage > st.id || (!isDemoAttackRunning && demoAttackStage >= 5);

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-colors ${
                    isCurrent
                      ? 'bg-white text-[#0A0A0A] border-white font-bold shadow-md'
                      : isCompleted
                      ? 'bg-white/10 text-white border-white/20 font-medium'
                      : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={
                        isCurrent
                          ? 'text-[#0037FF]'
                          : isCompleted
                          ? 'text-[#10B981]'
                          : 'text-white/40'
                      }
                    >
                      {st.stepNum}
                    </span>
                    <span className="truncate">{st.label}</span>
                  </div>
                  {isCompleted && (
                    <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" strokeWidth={2.5} />
                  )}
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-[#0037FF] animate-ping shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar (scaleX transform only) */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0037FF] origin-left transition-transform duration-300 ease-linear"
              style={{ transform: `scaleX(${demoAttackProgress})` }}
            />
          </div>
        </section>
      )}

      {/* 4) Empty State: If fewer than one shield result exists and demo not running */}
      {!hasAnyShieldResult && !fusionResult && !isDemoActive && (
        <div className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#0037FF]/10 flex items-center justify-center text-[#0037FF] mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mb-2">
            Run at least one shield first or try a demo attack
          </h3>
          <p className="text-sm text-[#6B6F76] max-w-[520px] mb-6">
            The Fusion Correlation Engine requires threat telemetry from Job Shield, Voice Shield, or SIM Guard to synthesize multi-vector attack patterns.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStartDemoAttack}
              className="px-5 py-2.5 rounded-xl bg-[#0037FF] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#0030E0] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN DEMO ATTACK ↗</span>
            </button>
            <Link
              to="/job"
              className="px-4 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#202020] transition-colors"
            >
              SCAN JOB OFFER ↗
            </Link>
            <Link
              to="/voice"
              className="px-4 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#202020] transition-colors"
            >
              VERIFY VOICE ↗
            </Link>
            <Link
              to="/sim"
              className="px-4 py-2.5 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#202020] transition-colors"
            >
              CHECK SIM GUARD ↗
            </Link>
          </div>
        </div>
      )}

      {/* 5) Input Signals & Scenario Selection */}
      <section aria-label="Input Vectors and Scenarios">
        <FusionSignalCards onRunFusion={handleRunFusion} isLoading={isLoading} />
      </section>

      {/* Error state alert if any */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#E11D2E]/10 border border-[#E11D2E]/30 text-[#E11D2E] text-xs font-mono-label flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleRunFusion}
            className="underline font-bold hover:text-[#0A0A0A] cursor-pointer"
          >
            RETRY
          </button>
        </div>
      )}

      {/* 6) Correlation In-Progress View: Shown during Stage 4 or when isLoading */}
      {(isLoading || (isDemoAttackRunning && demoAttackStage === 4)) && (
        <section aria-label="Cross-Vector Synthesis Processing">
          <FusionCorrelationView />
        </section>
      )}

      {/* 7) Results View: Rendered once fusionResult exists and not correlating in Stage 4 */}
      {fusionResult && !isLoading && (!isDemoAttackRunning || demoAttackStage >= 5) && (
        <section
          aria-label="Fusion Synthesis Intelligence Output"
          className="flex flex-col gap-12 sm:gap-16"
        >
          {/* Source Tag Badge */}
          <div className="flex items-center gap-2">
            {isDemoResult ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span>DEMO SCENARIO · SIMULATED INPUTS</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span>LIVE CORRELATION</span>
              </span>
            )}
          </div>

          {/* a) Overall Verdict Card */}
          <FusionVerdictCard
            fusionResult={fusionResult}
            onRunAgain={handleRunAgain}
            onClearAll={handleClearAll}
          />

          {/* b) Shield Contributions */}
          {fusionResult.contributions && fusionResult.contributions.length > 0 && (
            <FusionContributions contributions={fusionResult.contributions} />
          )}

          {/* c) 4-Stage Attack Chain Timeline */}
          {fusionResult.chain_steps && fusionResult.chain_steps.length > 0 && (
            <FusionAttackChain steps={fusionResult.chain_steps} />
          )}

          {/* d) Why These Signals Are Connected */}
          {fusionResult.correlations && (
            <FusionCorrelations correlations={fusionResult.correlations} />
          )}

          {/* e) AI Fusion Report */}
          <FusionAiReport fusionResult={fusionResult} />

          {/* f) Recommended Response Protocol */}
          <FusionResponseCard fusionResult={fusionResult} />
        </section>
      )}
    </div>
  );
});

FusionEnginePage.displayName = 'FusionEnginePage';
