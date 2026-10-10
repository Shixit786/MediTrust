import React, { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { MagneticButton } from '../ui/MagneticButton';
import { emitThreatFeedEvent, emitThreatFeedReset } from '../../services/threatFeedEvents';
import type { ShieldResult, FusionResult } from '../../types/analysis';

import jobMock from '../../services/mocks/job.json';
import voiceMock from '../../services/mocks/voice.json';
import simMock from '../../services/mocks/sim.json';
import fusionMock from '../../services/mocks/fusion.json';

function getNowTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export const DemoControlsBar: React.FC = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const demoStatus = useAnalysisStore((s) => s.demoStatus);
  const setDemoStatus = useAnalysisStore((s) => s.setDemoStatus);
  const setShieldStatus = useAnalysisStore((s) => s.setShieldStatus);
  const setShieldResult = useAnalysisStore((s) => s.setShieldResult);
  const setFusionResult = useAnalysisStore((s) => s.setFusionResult);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const resetDemo = useAnalysisStore((s) => s.resetDemo);

  const timeoutsRef = useRef<number[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const handleReset = useCallback(() => {
    clearAllTimeouts();
    resetDemo();
    emitThreatFeedReset();
    // remove demo search param if present without reload
    if (searchParams.get('demo')) {
      const next = new URLSearchParams(searchParams);
      next.delete('demo');
      setSearchParams(next, { replace: true });
    }
  }, [clearAllTimeouts, resetDemo, searchParams, setSearchParams]);

  const runDemoAttack = useCallback(() => {
    clearAllTimeouts();
    resetDemo();
    emitThreatFeedReset();
    setDemoStatus('running');

    // Initial feed event
    emitThreatFeedEvent({
      id: `evt-${Date.now()}-init`,
      timestamp: getNowTimestamp(),
      shield: 'system',
      message: 'Multi-vector threat simulation sequence initiated',
      severity: 'low',
    });

    // Step 1 (0s): Job Shield -> SCANNING
    const t1 = window.setTimeout(() => {
      setShieldStatus('job', 'scanning');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-job-scan`,
        timestamp: getNowTimestamp(),
        shield: 'job',
        message: 'WhatsApp recruitment PDF ingested: extracting URLs and signatures',
        severity: 'medium',
      });
    }, 100);

    // Step 1 finish (2.2s): Job Shield results ready
    const t2 = window.setTimeout(() => {
      setShieldResult('job', jobMock as ShieldResult);
      setShieldStatus('job', 'done');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-job-hit1`,
        timestamp: getNowTimestamp(),
        shield: 'job',
        message: 'Job offer asks for registration fee: flagged',
        severity: 'high',
      });
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-job-hit2`,
        timestamp: getNowTimestamp(),
        shield: 'job',
        message: 'Hospital-themed phishing link detected (VirusTotal 14/70)',
        severity: 'critical',
      });
    }, 2200);

    // Step 2 (3.2s): Voice Shield -> SCANNING
    const t3 = window.setTimeout(() => {
      setShieldStatus('voice', 'scanning');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-voice-scan`,
        timestamp: getNowTimestamp(),
        shield: 'voice',
        message: 'Suspicious HR follow-up call received: analyzing 9 spectral vectors',
        severity: 'medium',
      });
    }, 3200);

    // Step 2 finish (5.2s): Voice Shield results ready
    const t4 = window.setTimeout(() => {
      setShieldResult('voice', voiceMock as ShieldResult);
      setShieldStatus('voice', 'done');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-voice-hit`,
        timestamp: getNowTimestamp(),
        shield: 'voice',
        message: 'Synthetic voice cues in call audio: neural vocoder artifacts detected',
        severity: 'critical',
      });
    }, 5200);

    // Step 3 (6.2s): SIM Guard -> SCANNING
    const t5 = window.setTimeout(() => {
      setShieldStatus('sim', 'scanning');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-sim-scan`,
        timestamp: getNowTimestamp(),
        shield: 'sim',
        message: 'Carrier telemetry probe active: inspecting IMSI / location logs',
        severity: 'medium',
      });
    }, 6200);

    // Step 3 finish (8.0s): SIM Guard results ready
    const t6 = window.setTimeout(() => {
      setShieldResult('sim', simMock as ShieldResult);
      setShieldStatus('sim', 'done');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-sim-hit1`,
        timestamp: getNowTimestamp(),
        shield: 'sim',
        message: 'Device mismatch after SIM change: IMEI unverified',
        severity: 'high',
      });
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-sim-hit2`,
        timestamp: getNowTimestamp(),
        shield: 'sim',
        message: 'OTP flood: 7 attempts in 40s on target MSISDN',
        severity: 'critical',
      });
    }, 8000);

    // Step 4 (8.8s): Fusion Engine summary ready
    const t7 = window.setTimeout(() => {
      setFusionResult(fusionMock as FusionResult);
      setBlobTone('critical');
      setDemoStatus('done');
      emitThreatFeedEvent({
        id: `evt-${Date.now()}-fusion`,
        timestamp: getNowTimestamp(),
        shield: 'fusion',
        message: 'Freeze protocol engaged (simulated): composite attack chain confirmed',
        severity: 'critical',
      });
    }, 8800);

    timeoutsRef.current = [t1, t2, t3, t4, t5, t6, t7];
  }, [clearAllTimeouts, resetDemo, setBlobTone, setDemoStatus, setFusionResult, setShieldResult, setShieldStatus]);

  // Support URL parameter ?demo=1
  useEffect(() => {
    if (searchParams.get('demo') === '1' && demoStatus === 'idle') {
      const autoTimer = window.setTimeout(() => {
        runDemoAttack();
      }, 600);
      return () => clearTimeout(autoTimer);
    }
  }, [searchParams, demoStatus, runDemoAttack]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  const isRunning = demoStatus === 'running';

  return (
    <div className="w-full border-t border-b border-[#0A0A0A] py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left indicator */}
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
        <MonoLabel color="ink" className="text-xs sm:text-sm font-semibold tracking-wider">
          SEE THE WHOLE ATTACK CHAIN
        </MonoLabel>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {demoStatus !== 'idle' && (
          <button
            type="button"
            onClick={handleReset}
            className="font-mono-label text-xs text-[#6B6F76] hover:text-[#0A0A0A] transition-colors uppercase cursor-pointer bg-transparent border-none p-2"
          >
            [ RESET STATE ]
          </button>
        )}

        <MagneticButton
          onClick={runDemoAttack}
          disabled={isRunning}
          variant="primary"
          size="md"
          className="rounded-[16px] text-xs sm:text-sm"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              RUNNING SIMULATION (~9S)...
            </span>
          ) : (
            'RUN DEMO ATTACK'
          )}
        </MagneticButton>
      </div>
    </div>
  );
});

DemoControlsBar.displayName = 'DemoControlsBar';
