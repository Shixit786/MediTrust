import React, { useEffect, useRef } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import type { VoiceAnomaly } from '../../types/analysis';
import { AlertCircle, ShieldCheck } from 'lucide-react';

interface VoiceWaveformTimelineProps {
  peaks: number[];
  duration: number;
  anomalies: VoiceAnomaly[];
}

export const VoiceWaveformTimeline: React.FC<VoiceWaveformTimelineProps> = React.memo(
  ({ peaks, duration, anomalies }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Draw static waveform once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const barCount = Math.min(peaks.length, Math.floor(width / 5));
      if (barCount === 0) return;

      const barWidth = 2.5;
      const totalSpacing = width - barCount * barWidth;
      const gap = totalSpacing / Math.max(1, barCount - 1);

      ctx.fillStyle = '#0A0A0A';

      for (let i = 0; i < barCount; i++) {
        const peakIdx = Math.floor((i / barCount) * peaks.length);
        const peak = peaks[peakIdx] ?? 0.1;
        const barHeight = Math.max(4, peak * (height * 0.8));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }, [peaks]);

    const hasAnomalies = anomalies && anomalies.length > 0;
    const safeDuration = Math.max(1, duration || 18);

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8"
        aria-label="Acoustic Waveform and Anomaly Timeline"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#0A0A0A] mb-6">
          <div>
            <MonoLabel color="accent">WAVEFORM & ANOMALY TIMELINE</MonoLabel>
            <h3 className="text-xl sm:text-2xl font-light font-['Inter_Tight'] text-[#0A0A0A] mt-1">
              Temporal Artifact Mapping
            </h3>
          </div>
          <div className="font-mono-label text-xs text-[#6B6F76]">
            DURATION: {safeDuration.toFixed(1)}s · {hasAnomalies ? `${anomalies.length} ANOMALIES` : 'CLEAN'}
          </div>
        </div>

        {/* Waveform with Interactive Anomaly Marker Overlays */}
        <div className="relative w-full h-32 sm:h-36 bg-[#F0F0F0]/50 rounded-[16px] border border-[#0A0A0A]/10 p-4 flex items-center overflow-visible">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            aria-label="Audio waveform canvas"
          />

          {/* Anomaly Vertical Pins */}
          {hasAnomalies &&
            anomalies.map((anom, idx) => {
              const leftPercent = Math.min(96, Math.max(4, (anom.t_start / safeDuration) * 100));

              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 group cursor-pointer z-10 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                  tabIndex={0}
                >
                  {/* Vertical Hairline */}
                  <div className="w-[2px] h-full bg-[#EF4444] opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Marker Pin */}
                  <div className="absolute top-1 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#EF4444] text-white font-mono text-[9px] font-bold shadow-sm whitespace-nowrap">
                    {anom.t_start.toFixed(1)}s
                  </div>

                  {/* Pure CSS Hover / Focus Tooltip (0 React state updates) */}
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus:flex flex-col z-30 min-w-[200px] max-w-[260px] p-2.5 rounded-lg bg-[#0A0A0A] text-white text-[11px] font-sans leading-tight shadow-xl"
                  >
                    <span className="font-mono-label text-[10px] text-[#F5B800] uppercase mb-1">
                      {anom.feature} ({anom.t_start.toFixed(1)}s - {anom.t_end.toFixed(1)}s)
                    </span>
                    <span className="text-[#E0E0E0]">{anom.reason}</span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0A0A0A]" />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer info line */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[#6B6F76]">
          {hasAnomalies ? (
            <div className="flex items-center gap-1.5 text-[#DC2626]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>HOVER OR TAP RED MARKERS TO INSPECT TEMPORAL SPECTRAL ARTIFACTS</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#059669]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>UNIFORM ACOUSTIC INTEGRITY ACROSS UTTERANCE TIMELINE</span>
            </div>
          )}

          <span>0.0s — {safeDuration.toFixed(1)}s</span>
        </div>
      </section>
    );
  }
);

VoiceWaveformTimeline.displayName = 'VoiceWaveformTimeline';
