import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface WaveformPreviewProps {
  peaks: number[];
  audioUrl: string | null;
  duration?: number | null;
  fileName?: string | null;
  onClear?: () => void;
}

export const WaveformPreview: React.FC<WaveformPreviewProps> = React.memo(
  ({ peaks, audioUrl, duration, fileName, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Draw static waveform once whenever peaks change or canvas resizes
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

      const barCount = Math.min(peaks.length, Math.floor(width / 4));
      if (barCount === 0) return;

      const barWidth = 2;
      const totalSpacing = width - barCount * barWidth;
      const gap = totalSpacing / Math.max(1, barCount - 1);

      ctx.fillStyle = '#0A0A0A';

      for (let i = 0; i < barCount; i++) {
        const peakIdx = Math.floor((i / barCount) * peaks.length);
        const peak = peaks[peakIdx] ?? 0.1;
        const barHeight = Math.max(3, peak * (height * 0.85));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }, [peaks]);

    // Handle Play / Pause
    const togglePlayback = useCallback(() => {
      if (!audioRef.current && audioUrl) {
        const a = new Audio(audioUrl);
        audioRef.current = a;

        a.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        a.ontimeupdate = () => {
          setCurrentTime(a.currentTime);
        };
      }

      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Audio play prevented:', err);
          setIsPlaying(false);
        });
      }
    }, [audioUrl, isPlaying]);

    // Cleanup audio on unmount or URL change
    useEffect(() => {
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
      };
    }, [audioUrl]);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const displayDuration = duration ? formatTime(duration) : '0:00';
    const displayCurrent = formatTime(currentTime);

    return (
      <div className="w-full bg-white rounded-[16px] border border-[#0A0A0A] p-4 flex flex-col gap-3">
        {/* Header line with file info */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate max-w-[240px] sm:max-w-xs text-[#0A0A0A]">
            <Volume2 className="w-3.5 h-3.5 text-[#3B5BFF] shrink-0" />
            <span className="truncate font-medium">{fileName || 'Audio Track'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#6B6F76] text-[11px]">
              {displayCurrent} / {displayDuration}
            </span>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-[#6B6F76] hover:text-[#0A0A0A] uppercase transition-colors"
              >
                [REMOVE]
              </button>
            )}
          </div>
        </div>

        {/* Waveform Canvas & Play Button */}
        <div className="flex items-center gap-3">
          {audioUrl && (
            <button
              type="button"
              onClick={togglePlayback}
              className="w-9 h-9 rounded-full bg-[#0A0A0A] hover:bg-[#3B5BFF] text-white flex items-center justify-center transition-colors shrink-0"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          )}

          <div className="flex-1 h-12 relative overflow-hidden bg-[#F0F0F0]/50 rounded-lg flex items-center px-2">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              aria-label="Audio waveform visualization"
            />
          </div>
        </div>
      </div>
    );
  }
);

WaveformPreview.displayName = 'WaveformPreview';
