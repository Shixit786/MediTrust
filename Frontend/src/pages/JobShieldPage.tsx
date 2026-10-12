import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { api } from '../services/api';
import type { JobShieldResult } from '../types/analysis';
import { SAMPLE_SCAM_HOSPITAL } from '../services/mocks/jobSamples';
import { JobShieldHeader } from '../components/job/JobShieldHeader';
import { JobInputSection } from '../components/job/JobInputSection';
import { JobScanningView } from '../components/job/JobScanningView';
import { JobResultVerdict } from '../components/job/JobResultVerdict';
import { JobHighlightedMessage } from '../components/job/JobHighlightedMessage';
import { JobRedFlagsList } from '../components/job/JobRedFlagsList';
import { JobLinkAnalysis } from '../components/job/JobLinkAnalysis';
import { JobCompanyVerification } from '../components/job/JobCompanyVerification';
import { JobAiAnalysis } from '../components/job/JobAiAnalysis';
import { JobSafeNextStep } from '../components/job/JobSafeNextStep';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MonoLabel } from '../components/ui/MonoLabel';

export const JobShieldPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const jobShieldState = useAnalysisStore((s) => s.jobShieldState);
  const jobResult = useAnalysisStore((s) => s.jobResult);
  const setJobInput = useAnalysisStore((s) => s.setJobInput);
  const setJobShieldState = useAnalysisStore((s) => s.setJobShieldState);
  const setJobResult = useAnalysisStore((s) => s.setJobResult);
  const resetJobShield = useAnalysisStore((s) => s.resetJobShield);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const setShieldResult = useAnalysisStore((s) => s.setShieldResult);

  // Guard to ensure demo auto-run executes only once per visit
  const hasAutoRunRef = useRef(false);

  // Cached pending result while scanning view runs its 4s animation
  const pendingResultRef = useRef<JobShieldResult | null>(null);
  const pendingParamsRef = useRef<{ text?: string; file?: File | null }>({});
  const [isScamTarget, setIsScamTarget] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup: Reset gradient blob tone to idle on unmount
  useEffect(() => {
    return () => {
      setBlobTone('idle');
    };
  }, [setBlobTone]);

  // Synchronize blob tone whenever jobResult changes
  useEffect(() => {
    if (jobShieldState === 'done' && jobResult) {
      setBlobTone(jobResult.level);
    } else {
      setBlobTone('idle');
    }
  }, [jobShieldState, jobResult, setBlobTone]);

  const handleScan = useCallback(
    async (data: { text: string; file: File | null }) => {
      setErrorMessage(null);
      pendingParamsRef.current = data;

      // Determine target outcome for the scanning view animation
      const textLower = (data.text || '').toLowerCase();
      const hasFile = !!data.file;
      const scamKeywords = [
        'fee',
        'upi',
        'otp',
        'deposit',
        'limited seats',
        'aadhaar',
        'registration',
        'gulf',
        'ward coordinator',
      ];
      const isScam = hasFile || scamKeywords.some((kw) => textLower.includes(kw));
      setIsScamTarget(isScam);

      // Begin scanning phase
      setJobShieldState('scanning');

      try {
        // Pre-fetch mock analysis or start request immediately
        const res = await api.analyzeJob({ text: data.text, file: data.file });
        pendingResultRef.current = res;
      } catch (err) {
        console.error('Job analysis error:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to complete forensic job analysis. Please verify your connection and try again.'
        );
        setJobShieldState('error');
      }
    },
    [setJobShieldState]
  );

  // Auto-run support for demo mode: loads scam1 sample and runs scan automatically
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAutoRunRef.current && jobShieldState === 'idle') {
      hasAutoRunRef.current = true;
      setJobInput({ text: SAMPLE_SCAM_HOSPITAL, fileName: null });
      handleScan({ text: SAMPLE_SCAM_HOSPITAL, file: null });
    }
  }, [searchParams, jobShieldState, setJobInput, handleScan]);

  const handleScanComplete = useCallback(() => {
    if (pendingResultRef.current) {
      const res = pendingResultRef.current;
      setJobResult(res);
      setShieldResult('job', res);
      setJobShieldState('done');
      setBlobTone(res.level);
    } else if (!errorMessage) {
      // In case api took longer or failed
      setJobShieldState('error');
      setErrorMessage('Scan timed out. Please try again.');
    }
  }, [errorMessage, setBlobTone, setJobResult, setJobShieldState, setShieldResult]);

  const handleScanAnother = useCallback(() => {
    pendingResultRef.current = null;
    resetJobShield();
    setBlobTone('idle');
    setErrorMessage(null);
  }, [resetJobShield, setBlobTone]);

  const handleRetry = useCallback(() => {
    if (pendingParamsRef.current) {
      handleScan({
        text: pendingParamsRef.current.text || '',
        file: pendingParamsRef.current.file || null,
      });
    } else {
      handleScanAnother();
    }
  }, [handleScan, handleScanAnother]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col">
      {/* 1) Header */}
      <JobShieldHeader />

      {/* 2) Error State */}
      {jobShieldState === 'error' && (
        <div
          role="alert"
          className="p-6 rounded-[20px] bg-[#EF4444]/10 border border-[#EF4444]/30 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
            <div>
              <div className="font-mono text-xs font-bold text-[#DC2626] uppercase">
                ANALYSIS ENCOUNTERED AN ERROR
              </div>
              <p className="text-sm text-[#0A0A0A] font-light mt-0.5">
                {errorMessage || 'Failed to complete job threat intel checks.'}
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
      {(jobShieldState === 'idle' || jobShieldState === 'error') && (
        <JobInputSection onScan={handleScan} />
      )}

      {/* 4) Scanning View (Replaces input area while scanning) */}
      {jobShieldState === 'scanning' && (
        <JobScanningView
          isScamTarget={isScamTarget}
          onScanComplete={handleScanComplete}
        />
      )}

      {/* 5) Result View (Appears after scanning completes) */}
      {jobShieldState === 'done' && jobResult && (
        <div className="w-full space-y-2 animate-fade-in" aria-live="polite">
          {/* a) Verdict with Scam Probability */}
          <JobResultVerdict
            result={jobResult}
            onScanAnother={handleScanAnother}
          />

          {/* b) Highlighted Forensic Message */}
          <JobHighlightedMessage text={jobResult.extracted_text} />

          {/* c) Red Flag Pattern Detection List */}
          <JobRedFlagsList redFlags={jobResult.red_flags} />

          {/* d) Deep URL Forensics */}
          <JobLinkAnalysis urls={jobResult.urls} />

          {/* e) Company MCA21 Registry Verification */}
          <JobCompanyVerification company={jobResult.company} />

          {/* f) AI Forensics Report */}
          <JobAiAnalysis ai={jobResult.ai} />

          {/* g) Safe Next Step Card & Cybercrime Helpline */}
          <JobSafeNextStep result={jobResult} />
        </div>
      )}

      {/* Footer hairlines */}
      <div className="border-t border-[#0A0A0A]/20 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <MonoLabel color="muted">
          SHIELD 01 // FRAUD FORENSICS · ENHANCED RECRUITMENT DEFENSE
        </MonoLabel>
        <span className="font-mono text-xs text-[#6B6F76]">
          MEDITRUST AI HEALTHCARE SECURITY SUITE
        </span>
      </div>
    </div>
  );
});

JobShieldPage.displayName = 'JobShieldPage';
export default JobShieldPage;
