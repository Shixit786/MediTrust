import React, { useEffect, useState, useCallback } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { RevealText } from '../ui/RevealText';
import { isUsingMock } from '../../services/api';
import { checkHealth } from '../../lib/api/health';
import type { HealthResponse } from '../../lib/api/types';
import { RefreshCw } from 'lucide-react';

interface VoiceShieldHeaderProps {
  sourceOfTruth?: 'live' | 'demo' | null;
}

export const VoiceShieldHeader: React.FC<VoiceShieldHeaderProps> = React.memo(({ sourceOfTruth }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const fetchHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setIsChecking(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await fetchHealth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchHealth]);

  const isBackendOnline = health?.status === 'ok';
  const isAudioUp = health?.audio?.status === 'up';
  const hasFfmpeg = health?.audio?.ffmpeg;
  const showMock = sourceOfTruth === 'demo' || (sourceOfTruth === null && isUsingMock());
  const showLive = sourceOfTruth === 'live';

  return (
    <div className="w-full flex flex-col gap-6 pb-8 border-b border-[#0A0A0A]">
      <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
        {/* Left: Tag + Heading + Subtitle */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B5BFF]" aria-hidden="true" />
            <MonoLabel color="accent" className="text-xs sm:text-sm font-semibold tracking-[0.14em]">
              SHIELD 02 · DEEPFAKE AUDIO DETECTION
            </MonoLabel>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A] leading-none mb-4">
            <RevealText delay={0.05} stagger={0.08} duration={0.6}>
              Voice Shield
            </RevealText>
          </h1>

          <p className="text-base sm:text-lg text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-2xl leading-relaxed mb-3">
            Record a call or upload audio. Nine spectral features reveal whether a voice feels synthetic.
          </p>

          <p className="font-mono-label text-[11px] text-[#6B6F76] tracking-wider uppercase">
            * RISK INDICATOR, NOT PROOF. RESULTS NEED HUMAN VERIFICATION.
          </p>
        </div>

        {/* Right side: Status & Connectivity chips */}
        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Backend status chip */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
              isBackendOnline
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#EF4444]/10 text-[#DC2626] border-[#EF4444]/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
              <span>{isBackendOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}</span>
            </div>

            {/* Audio service status chip */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
              isAudioUp
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isAudioUp ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
              <span>{isAudioUp ? 'AUDIO SERVICE UP' : 'AUDIO SERVICE DOWN'}</span>
            </div>

            {/* FFmpeg status chip (if audio service exposed it) */}
            {hasChecked && health?.audio?.ffmpeg !== undefined && health.audio.ffmpeg !== null && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
                hasFfmpeg
                  ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                  : 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${hasFfmpeg ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                <span>{hasFfmpeg ? 'FFMPEG OK' : 'FFMPEG MISSING'}</span>
              </div>
            )}

            {/* Manual RECHECK link */}
            <button
              type="button"
              onClick={fetchHealth}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#0A0A0A]/20 hover:border-[#0A0A0A] text-xs font-mono font-medium text-[#0A0A0A] transition-colors cursor-pointer"
              title="Re-check backend and audio service connectivity"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>RECHECK</span>
            </button>
          </div>

          {/* Source of truth badge */}
          <div className="flex items-center gap-2">
            {showLive && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] font-mono text-[11px] font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>LIVE ANALYSIS</span>
              </div>
            )}
            {showMock && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#B45309] font-mono text-[11px] font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span>DEMO DATA</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Startup advice if offline or audio service down */}
      {hasChecked && (!isBackendOnline || !isAudioUp) && (
        <div className="p-3.5 rounded-xl bg-[#0A0A0A]/5 border border-[#0A0A0A]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-[#6B6F76]">
          <span>
            {!isBackendOnline && 'Backend offline. Run: npm run dev (in Backend directory)'}
            {!isBackendOnline && !isAudioUp && ' · '}
            {isBackendOnline && !isAudioUp && 'Audio microservice down. Run: npm run dev:audio (in Backend directory)'}
          </span>
          <span className="text-[10px] uppercase text-[#0A0A0A]/60">OFFLINE FALLBACK ACTIVE FOR DEMOS</span>
        </div>
      )}
    </div>
  );
});

VoiceShieldHeader.displayName = 'VoiceShieldHeader';
