import React, { useEffect, useState, useRef } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { Check, Clock } from 'lucide-react';
import { NeuralSynapseCanvas } from './NeuralSynapseCanvas';
import type { FeatureStatus } from '../../types/analysis';

export type VoiceAnalysisStage =
  | 'IDLE'
  | 'VALIDATING'
  | 'UPLOADING'
  | 'ANALYZING ON SERVER'
  | 'RECEIVED'
  | 'DONE'
  | 'ERROR';

interface VoiceAnalysisViewProps {
  stage: VoiceAnalysisStage;
  featureStatuses: FeatureStatus[];
  onHardTimeout?: () => void;
}

const PIPELINE_STEPS = [
  'DECODE AUDIO',
  'EXTRACT 9 FEATURES',
  'SCORE ANOMALIES',
  'AI FORENSICS',
];

export const VoiceAnalysisView: React.FC<VoiceAnalysisViewProps> = React.memo(
  ({ stage, featureStatuses, onHardTimeout }) => {
    // Pipeline active step: 0..3 derived from stage
    const [activeFeatureIndex, setActiveFeatureIndex] = useState<number>(0);

    // DOM refs for zero-rerender performance timer
    const elapsedSpanRef = useRef<HTMLSpanElement | null>(null);
    const longNoticeRef = useRef<HTMLDivElement | null>(null);
    const startTimeRef = useRef<number>(0);
    const intervalRef = useRef<number | null>(null);
    const featureStaggerRef = useRef<number | null>(null);

    // Map real stage to active pipeline step
    let activeStep = 0;
    let progressScale = 0.15;
    if (stage === 'VALIDATING') {
      activeStep = 0;
      progressScale = 0.2;
    } else if (stage === 'UPLOADING') {
      activeStep = 1;
      progressScale = 0.45;
    } else if (stage === 'ANALYZING ON SERVER') {
      activeStep = 2;
      progressScale = 0.8;
    } else if (stage === 'RECEIVED' || stage === 'DONE') {
      activeStep = 3;
      progressScale = 1.0;
    }

    // High performance elapsed seconds counter via DOM ref (no React state re-renders)
    useEffect(() => {
      startTimeRef.current = Date.now();

      intervalRef.current = window.setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (elapsedSpanRef.current) {
          elapsedSpanRef.current.textContent = `${elapsedSec}s`;
        }

        if (longNoticeRef.current) {
          if (elapsedSec >= 8 && elapsedSec < 45) {
            longNoticeRef.current.style.opacity = '1';
          } else {
            longNoticeRef.current.style.opacity = '0';
          }
        }

        if (elapsedSec >= 45) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onHardTimeout?.();
        }
      }, 1000);

      // Feature cluster stagger animation
      let currentIdx = 0;
      featureStaggerRef.current = window.setInterval(() => {
        currentIdx = (currentIdx + 1) % 9;
        setActiveFeatureIndex(currentIdx);
      }, 500);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (featureStaggerRef.current) clearInterval(featureStaggerRef.current);
      };
    }, [onHardTimeout]);

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#0A0A0A] bg-[#F0F0F0] px-3 py-1.5 rounded-lg border border-[#0A0A0A]/10">
              <Clock className="w-3.5 h-3.5 text-[#3B5BFF]" />
              <span ref={elapsedSpanRef}>0s</span>
            </div>
            <div className="font-mono-label text-xs text-[#6B6F76]">
              STAGE {activeStep + 1} OF 4
            </div>
          </div>
        </div>

        {/* Thin Overall Progress Bar (transform scaleX) */}
        <div className="w-full bg-[#0A0A0A]/5 h-[3px] overflow-hidden my-8">
          <div
            className="h-full bg-[#3B5BFF]"
            style={{
              transform: `scaleX(${progressScale})`,
              transformOrigin: 'left',
              transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* A. Pipeline strip: four mono steps connected by dotted hairline */}
        <div className="mb-8">
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

          {/* Current Lifecycle Stage Label & Long Clip Notice */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#0A0A0A]/10">
            <div className="font-mono-label text-xs font-semibold text-[#0A0A0A] tracking-wider uppercase">
              LIFECYCLE STAGE: <span className="text-[#3B5BFF] font-bold">{stage}</span>
            </div>
            <div
              ref={longNoticeRef}
              className="text-xs font-mono text-[#D97706] bg-[#F59E0B]/10 px-3 py-1 rounded-md border border-[#F59E0B]/30 transition-opacity duration-300"
              style={{ opacity: 0 }}
            >
              Still analysing, long clips take longer
            </div>
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
