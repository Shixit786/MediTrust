import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { api } from '../services/api';
import type { VoiceShieldResult, FeatureStatus } from '../types/analysis';
import { VoiceShieldHeader } from '../components/voice/VoiceShieldHeader';
import { VoiceInputSection } from '../components/voice/VoiceInputSection';
import { VoiceAnalysisView } from '../components/voice/VoiceAnalysisView';
import { VoiceResultVerdict } from '../components/voice/VoiceResultVerdict';
import { VoiceWaveformTimeline } from '../components/voice/VoiceWaveformTimeline';
import { VoiceFeaturesTable } from '../components/voice/VoiceFeaturesTable';
import { VoiceSynapseMapCard } from '../components/voice/VoiceSynapseMapCard';
import { VoiceAiReport } from '../components/voice/VoiceAiReport';
import { VoiceSafeNextStep } from '../components/voice/VoiceSafeNextStep';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MonoLabel } from '../components/ui/MonoLabel';

export const VoiceShieldPage: React.FC = React.memo(() => {
  const voiceShieldState = useAnalysisStore((s) => s.voiceShieldState);
  const voiceResult = useAnalysisStore((s) => s.voiceResult);
  const setVoiceShieldState = useAnalysisStore((s) => s.setVoiceShieldState);
  const setVoiceResult = useAnalysisStore((s) => s.setVoiceResult);
  const resetVoiceShield = useAnalysisStore((s) => s.resetVoiceShield);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const setShieldResult = useAnalysisStore((s) => s.setShieldResult);

  // Cached pending result during 4.5s analysis animation
  const pendingResultRef = useRef<VoiceShieldResult | null>(null);
  const pendingParamsRef = useRef<{
    file?: File | Blob | null;
    sampleId?: string | null;
    fileName?: string | null;
    duration?: number | null;
  }>({});

  const [featureStatuses, setFeatureStatuses] = useState<FeatureStatus[]>(() =>
    Array(9).fill('normal')
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup: Reset gradient blob tone to idle on unmount
  useEffect(() => {
    return () => {
      setBlobTone('idle');
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
      setErrorMessage(null);
      pendingParamsRef.current = data;

      // Determine feature statuses for staggered synapse visualization
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

      setVoiceShieldState('analyzing');

      try {
        const res = await api.analyzeVoice({
          file: data.file,
          sampleId: data.sampleId,
          fileName: data.fileName,
        });
        pendingResultRef.current = res;
      } catch (err) {
        console.error('Voice analysis error:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to complete acoustic forensic analysis. Please verify your connection and try again.'
        );
        setVoiceShieldState('error');
      }
    },
    [setVoiceShieldState]
  );

  const handleAnalysisComplete = useCallback(() => {
    if (pendingResultRef.current) {
      const res = pendingResultRef.current;
      setVoiceResult(res);
      setShieldResult('voice', res);
      setVoiceShieldState('done');
      setBlobTone(res.level);
    } else if (!errorMessage) {
      setVoiceShieldState('error');
      setErrorMessage('Analysis timed out. Please try again.');
    }
  }, [errorMessage, setBlobTone, setShieldResult, setVoiceResult, setVoiceShieldState]);

  const handleAnalyzeAnother = useCallback(() => {
    pendingResultRef.current = null;
    resetVoiceShield();
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
      {/* 1) Header */}
      <VoiceShieldHeader />

      {/* 2) Error State */}
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
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#202020] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY</span>
          </button>
        </div>
      )}

      {/* 3) Input Section (Visible when idle or after error) */}
      {(voiceShieldState === 'idle' || voiceShieldState === 'error') && (
        <VoiceInputSection onAnalyze={handleAnalyze} />
      )}

      {/* 4) Analysis View (Replaces input area while analyzing) */}
      {voiceShieldState === 'analyzing' && (
        <VoiceAnalysisView
          featureStatuses={featureStatuses}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {/* 5) Result View (Appears after analysis completes) */}
      {voiceShieldState === 'done' && voiceResult && (
        <div className="w-full space-y-2 animate-fade-in" aria-live="polite">
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

          {/* d) Neural Synapse Map Card (compact post-analysis frame) */}
          <VoiceSynapseMapCard
            featureStatuses={voiceResult.features.map((f) => f.status)}
          />

          {/* e) AI Forensics Report with English / Hinglish toggle */}
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
