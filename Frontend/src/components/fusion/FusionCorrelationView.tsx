import React, { useEffect, useState, useRef } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { isReducedMotion, isLowTierHardware } from '../../utils/perfGuard';

export const FusionCorrelationView: React.FC = React.memo(() => {
  const shieldResults = useAnalysisStore((s) => s.shieldResults);
  const isReduced = isReducedMotion() || isLowTierHardware();
  const [phase, setPhase] = useState<number>(() => (isReduced ? 2 : 0));
  const [statusText, setStatusText] = useState<string>(() =>
    isReduced ? 'BUILDING ATTACK CHAIN...' : 'COLLECTING SIGNALS...'
  );
  const timeoutsRef = useRef<number[]>([]);

  const hasJob = !!shieldResults.job;
  const hasVoice = !!shieldResults.voice;
  const hasSim = !!shieldResults.sim;

  // Determine which correlations can appear based on loaded inputs
  const jobHigh = hasJob && shieldResults.job!.risk >= 60;
  const voiceHigh = hasVoice && shieldResults.voice!.risk >= 60;
  const simHigh = hasSim && shieldResults.sim!.risk >= 60;

  const showSameLure = jobHigh && voiceHigh;
  const showTargetWindow = simHigh && (jobHigh || voiceHigh);
  const showOtpPath = jobHigh && simHigh;

  useEffect(() => {
    if (isReduced) {
      return;
    }

    const t1 = window.setTimeout(() => {
      setPhase(1);
      setStatusText('MATCHING PATTERNS...');
    }, 1200);

    const t2 = window.setTimeout(() => {
      setPhase(2);
      setStatusText('BUILDING ATTACK CHAIN...');
    }, 2400);

    timeoutsRef.current.push(t1, t2);

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [isReduced]);

  return (
    <div
      role="region"
      aria-label="Cross-Vector Synthesis Processing"
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 flex flex-col gap-8 overflow-hidden"
    >
      {/* Header and status line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF] animate-pulse" />
          <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
            CROSS-VECTOR CORRELATION IN PROGRESS
          </MonoLabel>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="font-mono-label text-xs font-bold text-[#0A0A0A] tracking-wider"
        >
          {statusText}
        </div>
      </div>

      {/* SVG Diagram */}
      <div className="w-full flex items-center justify-center py-4">
        <svg
          viewBox="0 0 600 240"
          className="w-full max-w-[640px] h-auto overflow-visible select-none"
          aria-label="Diagram showing active shield nodes connecting into the Fusion Engine"
        >
          <desc>
            Job Shield, Voice Shield, and SIM Guard vector nodes feeding telemetry into the central
            Fusion Engine integration node.
          </desc>

          <defs>
            <linearGradient id="lineGradJob" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F5B800" />
              <stop offset="100%" stopColor="#0037FF" />
            </linearGradient>
            <linearGradient id="lineGradVoice" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B5BFF" />
              <stop offset="100%" stopColor="#0037FF" />
            </linearGradient>
            <linearGradient id="lineGradSim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF4FA3" />
              <stop offset="100%" stopColor="#0037FF" />
            </linearGradient>
          </defs>

          {/* Connection Lines from Shields to Fusion */}
          {/* 1. Job to Fusion */}
          <line
            x1="120"
            y1="50"
            x2="460"
            y2="120"
            stroke={hasJob ? 'url(#lineGradJob)' : '#0A0A0A'}
            strokeWidth={hasJob ? '2' : '1'}
            strokeDasharray={hasJob ? (phase >= 1 ? 'none' : '4 4') : '4 4'}
            opacity={hasJob ? (phase >= 1 ? 1 : 0.4) : 0.15}
            className="transition-all duration-700"
          />

          {/* 2. Voice to Fusion */}
          <line
            x1="120"
            y1="120"
            x2="460"
            y2="120"
            stroke={hasVoice ? 'url(#lineGradVoice)' : '#0A0A0A'}
            strokeWidth={hasVoice ? '2' : '1'}
            strokeDasharray={hasVoice ? (phase >= 1 ? 'none' : '4 4') : '4 4'}
            opacity={hasVoice ? (phase >= 1 ? 1 : 0.4) : 0.15}
            className="transition-all duration-700"
          />

          {/* 3. SIM to Fusion */}
          <line
            x1="120"
            y1="190"
            x2="460"
            y2="120"
            stroke={hasSim ? 'url(#lineGradSim)' : '#0A0A0A'}
            strokeWidth={hasSim ? '2' : '1'}
            strokeDasharray={hasSim ? (phase >= 1 ? 'none' : '4 4') : '4 4'}
            opacity={hasSim ? (phase >= 1 ? 1 : 0.4) : 0.15}
            className="transition-all duration-700"
          />

          {/* Correlation Arc Lines between Shields (appear at phase 2) */}
          {showSameLure && (
            <g opacity={phase >= 2 ? 1 : 0} className="transition-opacity duration-700">
              <path
                d="M 100 50 C 40 75, 40 95, 100 120"
                fill="none"
                stroke="#0037FF"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x="20"
                y="90"
                fill="#0037FF"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SAME LURE
              </text>
            </g>
          )}

          {showTargetWindow && (
            <g opacity={phase >= 2 ? 1 : 0} className="transition-opacity duration-700">
              <path
                d="M 100 120 C 40 145, 40 165, 100 190"
                fill="none"
                stroke="#FF4FA3"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x="20"
                y="160"
                fill="#FF4FA3"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                TARGET WINDOW
              </text>
            </g>
          )}

          {showOtpPath && (
            <g opacity={phase >= 2 ? 1 : 0} className="transition-opacity duration-700">
              <path
                d="M 110 50 C 15 100, 15 140, 110 190"
                fill="none"
                stroke="#F5B800"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x="2"
                y="125"
                fill="#0A0A0A"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                OTP PATH
              </text>
            </g>
          )}

          {/* Shield Node 1: Job */}
          <g
            transform="translate(100, 50)"
            opacity={hasJob ? 1 : 0.4}
            className="transition-opacity duration-500"
          >
            <circle
              r="22"
              fill="#FFFFFF"
              stroke={hasJob ? '#0A0A0A' : '#0A0A0A'}
              strokeWidth="1.5"
              strokeDasharray={hasJob ? 'none' : '3 3'}
            />
            <circle
              r="7"
              fill={hasJob ? '#F5B800' : '#CCCCCC'}
              className={hasJob && phase >= 1 ? 'animate-ping origin-center' : ''}
              opacity={hasJob && phase >= 1 ? 0.3 : 1}
            />
            <circle r="7" fill={hasJob ? '#F5B800' : '#CCCCCC'} />
            <text
              x="32"
              y="4"
              fill="#0A0A0A"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              JOB SHIELD
            </text>
          </g>

          {/* Shield Node 2: Voice */}
          <g
            transform="translate(100, 120)"
            opacity={hasVoice ? 1 : 0.4}
            className="transition-opacity duration-500"
          >
            <circle
              r="22"
              fill="#FFFFFF"
              stroke={hasVoice ? '#0A0A0A' : '#0A0A0A'}
              strokeWidth="1.5"
              strokeDasharray={hasVoice ? 'none' : '3 3'}
            />
            <circle
              r="7"
              fill={hasVoice ? '#3B5BFF' : '#CCCCCC'}
              className={hasVoice && phase >= 1 ? 'animate-ping origin-center' : ''}
              opacity={hasVoice && phase >= 1 ? 0.3 : 1}
            />
            <circle r="7" fill={hasVoice ? '#3B5BFF' : '#CCCCCC'} />
            <text
              x="32"
              y="4"
              fill="#0A0A0A"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              VOICE SHIELD
            </text>
          </g>

          {/* Shield Node 3: SIM */}
          <g
            transform="translate(100, 190)"
            opacity={hasSim ? 1 : 0.4}
            className="transition-opacity duration-500"
          >
            <circle
              r="22"
              fill="#FFFFFF"
              stroke={hasSim ? '#0A0A0A' : '#0A0A0A'}
              strokeWidth="1.5"
              strokeDasharray={hasSim ? 'none' : '3 3'}
            />
            <circle
              r="7"
              fill={hasSim ? '#FF4FA3' : '#CCCCCC'}
              className={hasSim && phase >= 1 ? 'animate-ping origin-center' : ''}
              opacity={hasSim && phase >= 1 ? 0.3 : 1}
            />
            <circle r="7" fill={hasSim ? '#FF4FA3' : '#CCCCCC'} />
            <text
              x="32"
              y="4"
              fill="#0A0A0A"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SIM GUARD
            </text>
          </g>

          {/* Central Fusion Node (Right) */}
          <g transform="translate(480, 120)">
            <circle
              r="34"
              fill="#0037FF"
              className={phase >= 1 ? 'animate-pulse origin-center' : ''}
            />
            <circle r="26" fill="#FFFFFF" />
            <circle r="12" fill="#0037FF" />
            <text
              x="0"
              y="46"
              textAnchor="middle"
              fill="#0037FF"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              FUSION NODE
            </text>
          </g>
        </svg>
      </div>

      {/* Progress Bar (scaleX only) */}
      <div className="w-full flex flex-col gap-2">
        <div className="w-full h-1 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0037FF] origin-left transition-transform duration-[3500ms] ease-linear"
            style={{
              transform: phase === 0 ? 'scaleX(0.35)' : phase === 1 ? 'scaleX(0.7)' : 'scaleX(1)',
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono-label text-[#6B6F76]">
          <span>INGESTING TELEMETRY</span>
          <span>CROSS-VECTOR RECONSTRUCTION</span>
        </div>
      </div>
    </div>
  );
});

FusionCorrelationView.displayName = 'FusionCorrelationView';
