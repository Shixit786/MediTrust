import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { Check } from 'lucide-react';
import { NeuralSynapseCanvas } from './NeuralSynapseCanvas';
import type { FeatureStatus } from '../../types/analysis';

interface VoiceAnalysisViewProps {
  featureStatuses: FeatureStatus[];
  onAnalysisComplete: () => void;
}

const PIPELINE_STEPS = [
  'DECODE AUDIO',
  'EXTRACT 9 FEATURES',
  'SCORE ANOMALIES',
  'AI FORENSICS',
];

export const VoiceAnalysisView: React.FC<VoiceAnalysisViewProps> = React.memo(
  ({ featureStatuses, onAnalysisComplete }) => {
    // Pipeline active step: 0..3
    const [activeStep, setActiveStep] = useState<number>(0);
    // Active feature cluster index: 0..8 (-1 initially)
    const [activeFeatureIndex, setActiveFeatureIndex] = useState<number>(-1);
    const [progressStarted, setProgressStarted] = useState(false);

    // Stagger timeouts ref for pause & cleanup
    const timeoutsRef = useRef<number[]>([]);
    const startTimeRef = useRef<number>(0);
    const pausedElapsedRef = useRef<number>(0);
    const isCompletedRef = useRef<boolean>(false);

    const scheduleTimeline = useCallback(
      (offsetMs: number) => {
        timeoutsRef.current.forEach((id) => clearTimeout(id));
        timeoutsRef.current = [];

        // Pipeline step transitions
        const pipelineSchedule = [
          { time: 0, step: 0 },
          { time: 1100, step: 1 },
          { time: 2400, step: 2 },
          { time: 3600, step: 3 },
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

        // 9 Feature activation stagger (~380ms apart from 600ms to 3800ms)
        const featureDelays = [600, 1000, 1400, 1800, 2200, 2600, 3000, 3400, 3800];
        featureDelays.forEach((time, index) => {
          const delay = time - offsetMs;
          if (delay > 0) {
            const tid = window.setTimeout(() => {
              setActiveFeatureIndex(index);
            }, delay);
            timeoutsRef.current.push(tid);
          } else {
            setActiveFeatureIndex(index);
          }
        });

        // Analysis completion at 4500ms
        const finalDelay = 4500 - offsetMs;
        if (finalDelay > 0) {
          const tid = window.setTimeout(() => {
            if (!isCompletedRef.current) {
              isCompletedRef.current = true;
              onAnalysisComplete();
            }
          }, finalDelay);
          timeoutsRef.current.push(tid);
        } else if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onAnalysisComplete();
        }
      },
      [onAnalysisComplete]
    );

    useEffect(() => {
      startTimeRef.current = Date.now();
      scheduleTimeline(0);

      // Trigger CSS progress transform
      const frame = requestAnimationFrame(() => {
        setProgressStarted(true);
      });

      // Visibility change handler (pauses/resumes timeline when tab changes)
      const handleVisibilityChange = () => {
        if (isCompletedRef.current) return;

        if (document.hidden) {
          pausedElapsedRef.current = Date.now() - startTimeRef.current;
          timeoutsRef.current.forEach((id) => clearTimeout(id));
          timeoutsRef.current = [];
        } else {
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
        aria-label="Voice forensic analysis in progress"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#0A0A0A]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B5BFF] animate-pulse" />
              <MonoLabel color="accent">SYNAPSE EXTRACTION · ACOUSTIC PIPELINE</MonoLabel>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light font-['Inter_Tight'] text-[#0A0A0A]">
              Extracting 9 Spectral Vectors & Glottal Dynamics
            </h2>
          </div>
          <div className="font-mono-label text-xs text-[#6B6F76]">
            STAGE {activeStep + 1} OF 4
          </div>
        </div>

        {/* Thin Overall Progress Bar (transform scaleX) */}
        <div className="w-full bg-[#0A0A0A]/5 h-[3px] overflow-hidden my-8">
          <div
            className="h-full bg-[#3B5BFF]"
            style={{
              transform: progressStarted ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'left',
              transition: 'transform 4500ms cubic-bezier(0.2, 0.6, 0.35, 1)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* A. Pipeline strip: four mono steps connected by dotted hairline */}
        <div className="mb-10">
          <div className="relative flex items-center justify-between">
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-opacity duration-300 ${
                      isDone
                        ? 'bg-[#0A0A0A] text-white'
                        : isActive
                        ? 'bg-[#3B5BFF] text-white ring-4 ring-[#3B5BFF]/20'
                        : 'bg-white border border-[#0A0A0A]/30 text-[#6B6F76] opacity-60'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-2 font-mono-label text-[10px] sm:text-xs tracking-wider transition-opacity duration-300 text-center ${
                      isActive
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

        {/* B. NEURAL SYNAPSE VISUALIZER CARD */}
        <div className="p-6 sm:p-8 rounded-[16px] bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10 mb-4">
            <MonoLabel color="ink">LIVE NEURAL SYNAPSE RECONSTRUCTION</MonoLabel>
            <span className="font-mono-label text-xs text-[#3B5BFF] font-semibold">
              {activeFeatureIndex >= 0 ? `VECTOR 0${activeFeatureIndex + 1}/09` : 'INITIALIZING'}
            </span>
          </div>

          <NeuralSynapseCanvas
            activeFeatureIndex={activeFeatureIndex}
            featureStatuses={featureStatuses}
          />
        </div>
      </section>
    );
  }
);

VoiceAnalysisView.displayName = 'VoiceAnalysisView';
