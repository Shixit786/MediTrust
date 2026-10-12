import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { Check } from 'lucide-react';
import type { SourceCheckStatus } from '../../types/analysis';

interface JobScanningViewProps {
  isScamTarget: boolean;
  onScanComplete: () => void;
}

interface SourceItem {
  name: string;
  targetScamStatus: SourceCheckStatus;
}

const SOURCES: SourceItem[] = [
  { name: '1 GOOGLE SAFE BROWSING', targetScamStatus: 'flagged' },
  { name: '2 VIRUSTOTAL (75+ ENGINES)', targetScamStatus: 'flagged' },
  { name: '3 URLHAUS', targetScamStatus: 'flagged' },
  { name: '4 ABUSEIPDB', targetScamStatus: 'suspicious' },
  { name: '5 SECURITYTRAILS', targetScamStatus: 'suspicious' },
  { name: '6 HEURISTIC ENGINE', targetScamStatus: 'flagged' },
];

const PIPELINE_STEPS = [
  'EXTRACT TEXT',
  'FIND LINKS',
  'THREAT INTEL',
  'AI ANALYSIS',
];

// Memoized individual source row to prevent re-rendering unaffected rows
const SourceRowItem: React.FC<{
  name: string;
  status: 'checking' | SourceCheckStatus;
}> = React.memo(({ name, status }) => {
  const isChecking = status === 'checking';

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#0A0A0A]/10 text-xs sm:text-sm font-mono-label">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-2 h-2 rounded-full ${isChecking
              ? 'bg-[#F5B800] animate-pulse'
              : status === 'clean'
                ? 'bg-[#10B981]'
                : status === 'suspicious'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
            }`}
          style={{ willChange: 'opacity' }}
        />
        <span className="text-[#0A0A0A] font-medium tracking-wider">{name}</span>
      </div>

      <div>
        {isChecking ? (
          <span className="text-[#6B6F76] text-xs tracking-widest font-mono-label">
            CHECKING...
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-widest uppercase ${status === 'clean'
                ? 'bg-[#10B981]/10 text-[#059669]'
                : status === 'suspicious'
                  ? 'bg-[#F59E0B]/10 text-[#D97706]'
                  : 'bg-[#EF4444]/10 text-[#DC2626]'
              }`}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
});

SourceRowItem.displayName = 'SourceRowItem';

export const JobScanningView: React.FC<JobScanningViewProps> = React.memo(
  ({ isScamTarget, onScanComplete }) => {
    // Pipeline active step: 0..3
    const [activeStep, setActiveStep] = useState<number>(0);
    // Sources resolution statuses
    const [sourceStatuses, setSourceStatuses] = useState<('checking' | SourceCheckStatus)[]>(
      () => Array(6).fill('checking')
    );
    // Overall progress bar mounted trigger
    const [progressStarted, setProgressStarted] = useState(false);

    // Stagger timeouts ref for safe pause & cleanup
    const timeoutsRef = useRef<number[]>([]);
    const startTimeRef = useRef<number>(0);
    const pausedElapsedRef = useRef<number>(0);
    const isCompletedRef = useRef<boolean>(false);

    const scheduleTimeline = useCallback(
      (offsetMs: number) => {
        // Clear any pending timeouts
        timeoutsRef.current.forEach((id) => clearTimeout(id));
        timeoutsRef.current = [];

        // Pipeline schedule
        const pipelineSchedule = [
          { time: 0, step: 0 },
          { time: 1000, step: 1 },
          { time: 2000, step: 2 },
          { time: 3000, step: 3 },
        ];

        pipelineSchedule.forEach(({ time, step }) => {
          const delay = time - offsetMs;
          if (delay > 0) {
            const tid = window.setTimeout(() => {
              setActiveStep(step);
            }, delay);
            timeoutsRef.current.push(tid);
          } else {
            setActiveStep(step);
          }
        });

        // 6 Source rows stagger schedule (~500ms apart from 600ms to 3600ms)
        const sourceDelays = [650, 1250, 1850, 2450, 3050, 3650];
        sourceDelays.forEach((time, index) => {
          const delay = time - offsetMs;
          const targetStatus: SourceCheckStatus = isScamTarget
            ? SOURCES[index].targetScamStatus
            : 'clean';

          if (delay > 0) {
            const tid = window.setTimeout(() => {
              setSourceStatuses((prev) => {
                const next = [...prev];
                next[index] = targetStatus;
                return next;
              });
            }, delay);
            timeoutsRef.current.push(tid);
          } else {
            setSourceStatuses((prev) => {
              const next = [...prev];
              next[index] = targetStatus;
              return next;
            });
          }
        });

        // Complete callback at 4000ms
        const finalDelay = 4000 - offsetMs;
        if (finalDelay > 0) {
          const tid = window.setTimeout(() => {
            if (!isCompletedRef.current) {
              isCompletedRef.current = true;
              onScanComplete();
            }
          }, finalDelay);
          timeoutsRef.current.push(tid);
        } else if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onScanComplete();
        }
      },
      [isScamTarget, onScanComplete]
    );

    useEffect(() => {
      startTimeRef.current = Date.now();
      scheduleTimeline(0);

      // Trigger CSS progress transform
      const frame = requestAnimationFrame(() => {
        setProgressStarted(true);
      });

      // Handle visibility changes (pause/resume when tab is hidden/visible)
      const handleVisibilityChange = () => {
        if (isCompletedRef.current) return;

        if (document.hidden) {
          // Tab became hidden: record elapsed time and clear timeouts
          pausedElapsedRef.current = Date.now() - startTimeRef.current;
          timeoutsRef.current.forEach((id) => clearTimeout(id));
          timeoutsRef.current = [];
        } else {
          // Tab became visible: resume remaining schedule
          startTimeRef.current = Date.now() - pausedElapsedRef.current;
          scheduleTimeline(pausedElapsedRef.current);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        timeoutsRef.current.forEach((id) => clearTimeout(id));
      };
    }, [scheduleTimeline]);

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-16"
        aria-live="polite"
        aria-label="Job scan in progress"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#0A0A0A]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B800] animate-pulse" />
              <MonoLabel color="accent">SCANNING OFFER · FORENSICS ACTIVE</MonoLabel>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
              Executing 6-Source Threat Intel Verification
            </h2>
          </div>
          <div className="font-mono-label text-xs text-[#6B6F76]">
            STAGE {activeStep + 1} OF 4
          </div>
        </div>

        {/* Progress Bar (pure transform scaleX, no layout thrashing) */}
        <div className="w-full bg-[#0A0A0A]/5 h-[3px] overflow-hidden my-8">
          <div
            className="h-full bg-[#F5B800]"
            style={{
              transform: progressStarted ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'left',
              transition: 'transform 4000ms cubic-bezier(0.2, 0.6, 0.35, 1)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* A. Pipeline strip: four mono steps connected by dotted hairline */}
        <div className="mb-12">
          <div className="relative flex items-center justify-between">
            {/* Dotted background hairline */}
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-[#0A0A0A]/20 -z-0"
              aria-hidden="true"
            />

            {PIPELINE_STEPS.map((stepName, idx) => {
              const isDone = idx < activeStep;
              const isActive = idx === activeStep;

              return (
                <div
                  key={stepName}
                  className="relative z-10 flex flex-col items-center bg-white px-2 sm:px-4"
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-opacity duration-300 ${isDone
                        ? 'bg-[#0A0A0A] text-white'
                        : isActive
                          ? 'bg-[#F5B800] text-[#0A0A0A] ring-4 ring-[#F5B800]/20'
                          : 'bg-white border border-[#0A0A0A]/30 text-[#6B6F76] opacity-60'
                      }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-2 font-mono-label text-[10px] sm:text-xs tracking-wider transition-opacity duration-300 text-center ${isActive
                        ? 'text-[#0A0A0A] font-bold'
                        : isDone
                          ? 'text-[#0A0A0A]'
                          : 'text-[#6B6F76] opacity-60'
                      }`}
                  >
                    {stepName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. Six-source check panel */}
        <div className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10">
          <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A]/10 mb-2">
            <MonoLabel color="ink">LIVE INTELLIGENCE FEED STATUS</MonoLabel>
            <MonoLabel color="muted">STAGGERED RESOLUTION</MonoLabel>
          </div>

          <div className="divide-y divide-[#0A0A0A]/5">
            {SOURCES.map((source, idx) => (
              <SourceRowItem
                key={source.name}
                name={source.name}
                status={sourceStatuses[idx]}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }
);

JobScanningView.displayName = 'JobScanningView';
