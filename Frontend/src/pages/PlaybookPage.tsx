import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { FUSION_SCENARIOS } from '../services/mocks/fusionScenarios';
import { PlaybookHeader } from '../components/playbook/PlaybookHeader';
import { PlaybookSituation } from '../components/playbook/PlaybookSituation';
import { PlaybookSteps } from '../components/playbook/PlaybookSteps';
import { PlaybookGuardianAlert } from '../components/playbook/PlaybookGuardianAlert';
import { PlaybookIncidentReport } from '../components/playbook/PlaybookIncidentReport';
import type { RiskLevel } from '../types/analysis';

const SHIELD_METAS = [
  { id: 'job', name: 'JOB SHIELD', dotColor: '#F5B800' },
  { id: 'voice', name: 'VOICE SHIELD', dotColor: '#3B5BFF' },
  { id: 'sim', name: 'SIM GUARD', dotColor: '#FF4FA3' },
];

export const PlaybookPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const shieldResults = useAnalysisStore((s) => s.shieldResults);
  const fusionResult = useAnalysisStore((s) => s.fusionResult);
  const setShieldResultsMap = useAnalysisStore((s) => s.setShieldResultsMap);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);

  // Clean up blob tone on unmount
  useEffect(() => {
    return () => {
      setBlobTone('idle');
    };
  }, [setBlobTone]);

  const hasJob = !!shieldResults.job;
  const hasVoice = !!shieldResults.voice;
  const hasSim = !!shieldResults.sim;
  const hasAnyResult = hasJob || hasVoice || hasSim || !!fusionResult;

  // In demo mode: if no scenario loaded yet, auto populate full attack chain scenario
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAnyResult) {
      const fullChain = FUSION_SCENARIOS.FULL_ATTACK_CHAIN;
      if (fullChain) {
        setShieldResultsMap(fullChain.results);
      }
    }
  }, [searchParams, hasAnyResult, setShieldResultsMap]);

  // Active shield badges
  const activeShields = useMemo(() => {
    return SHIELD_METAS.filter((m) => !!shieldResults[m.id as keyof typeof shieldResults]);
  }, [shieldResults]);

  // Derive highest risk and level
  const situationScore = useMemo(() => {
    if (fusionResult) return fusionResult.overall_risk;
    const scores = Object.values(shieldResults).map((s) => s?.risk || 0);
    return scores.length > 0 ? Math.max(...scores) : 0;
  }, [fusionResult, shieldResults]);

  const situationLevel: RiskLevel = useMemo(() => {
    if (fusionResult) return fusionResult.level;
    if (situationScore >= 80) return 'critical';
    if (situationScore >= 60) return 'high';
    if (situationScore >= 30) return 'medium';
    return 'low';
  }, [fusionResult, situationScore]);

  const situationPattern = useMemo(() => {
    if (fusionResult) return fusionResult.pattern;
    const highest = Object.values(shieldResults).reduce(
      (prev, curr) => (curr && curr.risk > (prev?.risk || 0) ? curr : prev),
      undefined as (typeof shieldResults)[keyof typeof shieldResults]
    );
    return highest ? `${highest.threat} Vector Detected` : 'Awaiting Vector Scan';
  }, [fusionResult, shieldResults]);

  const handleLoadDemoScenario = () => {
    const fullChain = FUSION_SCENARIOS.FULL_ATTACK_CHAIN;
    if (fullChain) {
      setShieldResultsMap(fullChain.results);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
      {/* 1) Header */}
      <PlaybookHeader
        hasResult={hasAnyResult}
        onLoadScenario={handleLoadDemoScenario}
      />

      {/* When a result exists, render the core playbook sections */}
      {hasAnyResult && (
        <>
          {/* 2) Situation Summary */}
          <PlaybookSituation
            score={situationScore}
            level={situationLevel}
            pattern={situationPattern}
            activeShields={activeShields}
          />

          {/* 3) Step-by-Step Playbook */}
          <section aria-label="Step-by-Step Containment Directives">
            <PlaybookSteps
              hasVoice={hasVoice}
              hasJob={hasJob}
              hasSim={hasSim}
            />
          </section>

          {/* 4) Guardian Alert (Trusted Contact) */}
          <section aria-label="Guardian Emergency Broadcast">
            <PlaybookGuardianAlert
              level={situationLevel}
              pattern={situationPattern}
            />
          </section>

          {/* 5) Incident Report */}
          <section aria-label="Incident Forensic Report">
            <PlaybookIncidentReport
              fusionResult={fusionResult}
              shieldResults={shieldResults}
            />
          </section>
        </>
      )}
    </div>
  );
});

PlaybookPage.displayName = 'PlaybookPage';
