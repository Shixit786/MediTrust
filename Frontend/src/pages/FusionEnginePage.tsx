import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { api } from '../services/api';
import { FUSION_SCENARIOS } from '../services/mocks/fusionScenarios';

import { FusionHeader } from '../components/fusion/FusionHeader';
import { FusionSignalCards } from '../components/fusion/FusionSignalCards';
import { FusionCorrelationView } from '../components/fusion/FusionCorrelationView';
import { FusionVerdictCard } from '../components/fusion/FusionVerdictCard';
import { FusionContributions } from '../components/fusion/FusionContributions';
import { FusionAttackChain } from '../components/fusion/FusionAttackChain';
import { FusionCorrelations } from '../components/fusion/FusionCorrelations';
import { FusionAiReport } from '../components/fusion/FusionAiReport';
import { FusionResponseCard } from '../components/fusion/FusionResponseCard';

export const FusionEnginePage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fusionResult = useAnalysisStore((s) => s.fusionResult);
  const setFusionResult = useAnalysisStore((s) => s.setFusionResult);
  const setShieldResultsMap = useAnalysisStore((s) => s.setShieldResultsMap);
  const clearAllShields = useAnalysisStore((s) => s.clearAllShields);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);

  const timeoutsRef = useRef<number[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoRunRef = useRef(false);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Reset blobTone to idle on unmount and clear active timers
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setBlobTone('idle');
    };
  }, [clearAllTimeouts, setBlobTone]);

  // Execute fusion correlation pipeline
  const handleRunFusion = useCallback(async () => {
    clearAllTimeouts();
    setErrorMessage(null);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentShields = useAnalysisStore.getState().shieldResults;
      const result = await api.runFusion(currentShields, controller.signal);
      setFusionResult(result);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setErrorMessage('Synthesis could not be completed. Please retry the analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [clearAllTimeouts, setFusionResult]);

  // Demo mode support: ?demo=1 loads FULL ATTACK CHAIN and starts fusion after 600ms
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAutoRunRef.current) {
      hasAutoRunRef.current = true;
      const fullChain = FUSION_SCENARIOS.FULL_ATTACK_CHAIN;
      if (fullChain) {
        setShieldResultsMap(fullChain.results);

        const t = window.setTimeout(() => {
          handleRunFusion();
        }, 600);

        timeoutsRef.current.push(t);
      }
    }
  }, [searchParams, setShieldResultsMap, handleRunFusion]);

  const handleClearAll = useCallback(() => {
    clearAllTimeouts();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    clearAllShields();
    setErrorMessage(null);
  }, [clearAllTimeouts, clearAllShields]);

  const handleRunAgain = useCallback(() => {
    setFusionResult(null);
    handleRunFusion();
  }, [setFusionResult, handleRunFusion]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
      {/* 1) Page Header */}
      <FusionHeader showBackToDashboard={true} />

      {/* 2) Input Signals & Scenario Selection */}
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

      {/* 3) Correlation In-Progress View */}
      {isLoading && (
        <section aria-label="Cross-Vector Synthesis Processing">
          <FusionCorrelationView />
        </section>
      )}

      {/* 4) Results View: Rendered once fusionResult exists and not currently fusing */}
      {fusionResult && !isLoading && (
        <section
          aria-label="Fusion Synthesis Intelligence Output"
          className="flex flex-col gap-12 sm:gap-16"
        >
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
