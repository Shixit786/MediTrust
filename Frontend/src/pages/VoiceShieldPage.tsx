import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { api, isUsingMock } from '../services/api';
import { API_BASE_URL } from '../lib/api/client';
import type { FeatureStatus } from '../types/analysis';
import { VoiceShieldHeader } from '../components/voice/VoiceShieldHeader';
import { VoiceInputSection } from '../components/voice/VoiceInputSection';
import { VoiceAnalysisView, type VoiceAnalysisStage } from '../components/voice/VoiceAnalysisView';
import { VoiceResultVerdict } from '../components/voice/VoiceResultVerdict';
import { VoiceWaveformTimeline } from '../components/voice/VoiceWaveformTimeline';
import { VoiceFeaturesTable } from '../components/voice/VoiceFeaturesTable';
import { VoiceSynapseMapCard } from '../components/voice/VoiceSynapseMapCard';
import { VoiceAiReport } from '../components/voice/VoiceAiReport';
import { VoiceSafeNextStep } from '../components/voice/VoiceSafeNextStep';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MonoLabel } from '../components/ui/MonoLabel';

export const VoiceShieldPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const voiceShieldState = useAnalysisStore((s) => s.voiceShieldState);
  const voiceResult = useAnalysisStore((s) => s.voiceResult);
  const setVoiceShieldState = useAnalysisStore((s) => s.setVoiceShieldState);
  const setVoiceResult = useAnalysisStore((s) => s.setVoiceResult);
  const resetVoiceShield = useAnalysisStore((s) => s.resetVoiceShield);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const setShieldResult = useAnalysisStore((s) => s.setShieldResult);

  // Guard to ensure demo auto-run executes only once per visit
  const hasAutoRunRef = useRef(false);

  // In-flight abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cached pending request params for RETRY
  const pendingParamsRef = useRef<{
    file?: File | Blob | null;
    sampleId?: string | null;
    fileName?: string | null;
    duration?: number | null;
  }>({});

  // Real request lifecycle stage
  const [stage, setStage] = useState<VoiceAnalysisStage>('IDLE');
  const [featureStatuses, setFeatureStatuses] = useState<FeatureStatus[]>(() =>
    Array(9).fill('normal')
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dev-only debug strip state
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    stage: string;
    status: number;
    code: string;
    durationMs: number;
    baseUrl: string;
    isMock: boolean;
  } | null>(null);

  // Reset gradient blob tone to idle on unmount & abort real in-flight requests
  useEffect(() => {
    return () => {
      setBlobTone('idle');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [setBlobTone]);

  // Synchronize blob tone whenever voiceResult changes
  useEffect(() => {
    if (voiceShieldState === 'done' && voiceResult) {
      setBlobTone(voiceResult.level);
    } else {
      setBlobTone('idle');
    }
  }, [voiceShieldState, voiceResult, setBlobTone]);

  const handleAnalyze = useCallback(
    async (data: {
      file?: File | Blob | null;
      sampleId?: string | null;
      fileName?: string | null;
      duration?: number | null;
    }) => {
      // Prevent double submits while in-flight
      if (voiceShieldState === 'analyzing') {
        return;
      }

      setErrorMessage(null);
      pendingParamsRef.current = data;

      // Abort previous in-flight request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Determine feature statuses for synapse visualization
      const sampleId = data.sampleId;
      const name = (data.fileName || '').toLowerCase();
      const isHuman = sampleId === 'real_human' || name.includes('human') || name.includes('real');
      const isAI2 = sampleId === 'patient_support' || name.includes('support') || name.includes('patient');

      if (isHuman) {
        setFeatureStatuses(Array(9).fill('normal'));
      } else if (isAI2) {
        setFeatureStatuses([
          'suspicious',
          'anomalous',
          'anomalous',
          'suspicious',
          'suspicious',
          'anomalous',
          'suspicious',
          'suspicious',
          'anomalous',
        ]);
      } else {
        // AI Deepfake default
        setFeatureStatuses([
          'anomalous',
          'anomalous',
          'anomalous',
          'suspicious',
          'anomalous',
          'suspicious',
          'anomalous',
          'suspicious',
          'anomalous',
        ]);
      }

      // Transition: VALIDATING -> UPLOADING -> ANALYZING ON SERVER -> RECEIVED -> DONE
      setVoiceShieldState('analyzing');
      setStage('VALIDATING');

      const startTime = Date.now();

      try {
        setStage('UPLOADING');

        // Allow microtask to reflect UPLOADING before proceeding
        const res = await api.analyzeVoice(
          {
            file: data.file,
            sampleId: data.sampleId,
            fileName: data.fileName,
          },
          controller.signal
        );

        setStage('RECEIVED');
        const durationMs = Date.now() - startTime;

        setDebugInfo({
          stage: 'RECEIVED',
          status: 200,
          code: 'OK',
          durationMs,
          baseUrl: API_BASE_URL,
          isMock: isUsingMock() || res._source === 'demo',
        });

        // Store result into state and global shieldResults for Dashboard & Fusion
        setVoiceResult(res);
        setShieldResult('voice', res);

        // Brief delay for visual completion
        window.setTimeout(() => {
          setVoiceShieldState('done');
          setStage('DONE');
          setBlobTone(res.level);
        }, 350);
      } catch (err: unknown) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        if (isAbort && controller.signal.aborted) {
          return;
        }

        const durationMs = Date.now() - startTime;
        const errObj = err as { code?: string; status?: number; message?: string };
        const code = errObj.code || 'UNKNOWN_ERROR';
        const status = errObj.status || 0;
        const msg =
          errObj.message ||
          'Unable to complete acoustic forensic analysis. Please verify your connection and try again.';

        if (import.meta.env.DEV) {
          // Log only non-sensitive debug telemetry
          console.warn('[Voice Analysis] Request failed:', {
            stage,
            code,
            status,
            durationMs,
          });
        }

        setDebugInfo({
          stage: 'ERROR',
          status,
          code,
          durationMs,
          baseUrl: API_BASE_URL,
          isMock: isUsingMock(),
        });

        setErrorMessage(msg);
        setStage('ERROR');
        setVoiceShieldState('error');
      }
    },
    [voiceShieldState, setVoiceShieldState, setVoiceResult, setShieldResult, setBlobTone, stage]
  );

  // Auto-run support for demo mode: loads AI sample and analyses automatically
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAutoRunRef.current && voiceShieldState === 'idle') {
      hasAutoRunRef.current = true;
      handleAnalyze({
        sampleId: 'ai_deepfake',
        fileName: 'Fake_Doctor_Call_AI.mp3',
        duration: 18,
      });
    }
  }, [searchParams, voiceShieldState, handleAnalyze]);

  const handleHardTimeout = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStage('ERROR');
    setVoiceShieldState('error');
    setErrorMessage(
      'Acoustic verification timed out after 45 seconds. The server may be busy or processing a long clip. Please try again.'
    );
  }, [setVoiceShieldState]);

  const handleAnalyzeAnother = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetVoiceShield();
    setStage('IDLE');
    setBlobTone('idle');
    setErrorMessage(null);
  }, [resetVoiceShield, setBlobTone]);

  const handleRetry = useCallback(() => {
    if (pendingParamsRef.current) {
      handleAnalyze(pendingParamsRef.current);
    } else {
      handleAnalyzeAnother();
    }
  }, [handleAnalyze, handleAnalyzeAnother]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col">
      {/* 1) Header with real connectivity and source-of-truth badge */}
      <VoiceShieldHeader sourceOfTruth={voiceResult?._source || null} />

      {/* Development-Only Diagnostics Strip */}
      {import.meta.env.DEV && debugInfo && (
        <div className="my-4 p-3.5 rounded-xl bg-[#F0F0F0] border border-[#0A0A0A]/15 text-xs font-mono">
          <button
            type="button"
            onClick={() => setDebugOpen(!debugOpen)}
            className="flex items-center justify-between w-full text-left font-bold text-[#0A0A0A] hover:text-[#3B5BFF] transition-colors cursor-pointer"
          >
            <span>[DEV DIAGNOSTICS] LAST FORENSIC REQUEST STATUS</span>
            <span className="text-[11px]">{debugOpen ? '▲ COLLAPSE' : '▼ EXPAND'}</span>
          </button>
          {debugOpen && (
            <div className="mt-3 pt-2.5 border-t border-[#0A0A0A]/10 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[#6B6F76]">
              <div>STAGE: <span className="text-[#0A0A0A] font-semibold">{debugInfo.stage}</span></div>
              <div>HTTP STATUS: <span className="text-[#0A0A0A] font-semibold">{debugInfo.status || 'N/A'}</span></div>
              <div>CODE: <span className="text-[#0A0A0A] font-semibold">{debugInfo.code}</span></div>
              <div>DURATION: <span className="text-[#0A0A0A] font-semibold">{debugInfo.durationMs}ms</span></div>
              <div>BASE URL: <span className="text-[#0A0A0A] font-semibold">{debugInfo.baseUrl}</span></div>
              <div>MOCK ACTIVE: <span className="text-[#0A0A0A] font-semibold">{debugInfo.isMock ? 'YES' : 'NO'}</span></div>
            </div>
          )}
        </div>
      )}

      {/* 2) Error State with Retry Button */}
      {voiceShieldState === 'error' && (
        <div
          role="alert"
          className="p-6 rounded-[20px] bg-[#EF4444]/10 border border-[#EF4444]/30 my-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
            <div>
              <div className="font-mono text-xs font-bold text-[#DC2626] uppercase">
                ACOUSTIC INTAKE ERROR
              </div>
              <p className="text-sm text-[#0A0A0A] font-light mt-0.5">
                {errorMessage || 'Failed to complete audio threat verification.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#202020] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY</span>
          </button>
        </div>
      )}

      {/* 3) Input Section (Visible when idle or after error) */}
      {(voiceShieldState === 'idle' || voiceShieldState === 'error') && (
        <VoiceInputSection
          onAnalyze={handleAnalyze}
          isAnalyzing={false}
        />
      )}

      {/* 4) Analysis View (Real request lifecycle driven) */}
      {voiceShieldState === 'analyzing' && (
        <VoiceAnalysisView
          stage={stage}
          featureStatuses={featureStatuses}
          onHardTimeout={handleHardTimeout}
        />
      )}

      {/* 5) Result View (Appears after analysis completes) */}
      {voiceShieldState === 'done' && voiceResult && (
        <div className="w-full space-y-4 animate-fade-in" aria-live="polite">
          {/* Demo Fallback Data Badge */}
          {voiceResult._source === 'demo' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span>Demo data (backend offline)</span>
            </div>
          )}

          {/* a) Verdict with Synthetic Voice Risk */}
          <VoiceResultVerdict
            result={voiceResult}
            onAnalyzeAnother={handleAnalyzeAnother}
          />

          {/* b) Waveform + Anomaly Timeline */}
          <VoiceWaveformTimeline
            peaks={voiceResult.peaks}
            duration={voiceResult.duration_sec}
            anomalies={voiceResult.anomalies}
          />

          {/* c) Nine Features Table */}
          <VoiceFeaturesTable features={voiceResult.features} />

          {/* d) Neural Synapse Map Card */}
          <VoiceSynapseMapCard
            featureStatuses={voiceResult.features.map((f) => f.status)}
          />

          {/* e) AI Forensics Report */}
          <VoiceAiReport ai={voiceResult.ai} />

          {/* f) Safe Next Step Card & Cybercrime Helpline */}
          <VoiceSafeNextStep result={voiceResult} />
        </div>
      )}

      {/* Footer hairlines */}
      <div className="border-t border-[#0A0A0A]/20 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <MonoLabel color="muted">
          SHIELD 02 // DEEPFAKE AUDIO DETECTION · HIGH-RISK CALL PROTECTION
        </MonoLabel>
        <span className="font-mono text-xs text-[#6B6F76]">
          MEDITRUST AI HEALTHCARE SECURITY SUITE
        </span>
      </div>
    </div>
  );
});

VoiceShieldPage.displayName = 'VoiceShieldPage';
export default VoiceShieldPage;
