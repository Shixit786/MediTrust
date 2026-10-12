import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { Play, Pause, ChevronLeft, ChevronRight, X, RotateCcw, Check } from 'lucide-react';

interface StepDef {
  id: number;
  label: string;
  name: string;
  path: string;
}

const STEPS: StepDef[] = [
  { id: 0, label: '01', name: 'JOB', path: '/job?demo=1' },
  { id: 1, label: '02', name: 'VOICE', path: '/voice?demo=1' },
  { id: 2, label: '03', name: 'SIM', path: '/sim?demo=1' },
  { id: 3, label: '04', name: 'FUSION', path: '/fusion?demo=1' },
  { id: 4, label: '05', name: 'PLAYBOOK', path: '/playbook?demo=1' },
];

export const DemoConductor: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const presenter = useAnalysisStore((s) => s.presenter);
  const startPresenter = useAnalysisStore((s) => s.startPresenter);
  const setPresenterStep = useAnalysisStore((s) => s.setPresenterStep);
  const toggleAutoplay = useAnalysisStore((s) => s.toggleAutoplay);
  const exitPresenter = useAnalysisStore((s) => s.exitPresenter);
  const resetAll = useAnalysisStore((s) => s.resetAll);

  // Status indicators from store
  const jobShieldState = useAnalysisStore((s) => s.jobShieldState);
  const voiceShieldState = useAnalysisStore((s) => s.voiceShieldState);
  const simStatus = useAnalysisStore((s) => s.simStatus);
  const shieldResults = useAnalysisStore((s) => s.shieldResults);
  const fusionResult = useAnalysisStore((s) => s.fusionResult);

  const autoTimerRef = useRef<number | null>(null);

  // Determine which steps are completed
  const isStepDone = useCallback(
    (stepIndex: number): boolean => {
      switch (stepIndex) {
        case 0:
          return jobShieldState === 'done' || !!shieldResults.job;
        case 1:
          return voiceShieldState === 'done' || !!shieldResults.voice;
        case 2:
          return simStatus === 'frozen' || simStatus === 'confirmed' || !!shieldResults.sim;
        case 3:
          return fusionResult !== null;
        case 4:
          return true; // Playbook is the terminal step
        default:
          return false;
      }
    },
    [jobShieldState, voiceShieldState, simStatus, shieldResults, fusionResult]
  );

  const currentStepDone = isStepDone(presenter.step);

  // Clear pending autoplay timer
  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  // Jump to specific step
  const goToStep = useCallback(
    (stepIdx: number) => {
      clearAutoTimer();
      const clamped = Math.max(0, Math.min(4, stepIdx));
      setPresenterStep(clamped);
      navigate(STEPS[clamped].path);
    },
    [clearAutoTimer, setPresenterStep, navigate]
  );

  const handleNext = useCallback(() => {
    if (presenter.step < 4) {
      goToStep(presenter.step + 1);
    }
  }, [presenter.step, goToStep]);

  const handlePrev = useCallback(() => {
    if (presenter.step > 0) {
      goToStep(presenter.step - 1);
    }
  }, [presenter.step, goToStep]);

  const handleReset = useCallback(() => {
    clearAutoTimer();
    resetAll();
    goToStep(0);
  }, [clearAutoTimer, resetAll, goToStep]);

  const handleExit = useCallback(() => {
    clearAutoTimer();
    exitPresenter();
  }, [clearAutoTimer, exitPresenter]);

  // Synchronize step index with current pathname if loaded directly or navigated
  useEffect(() => {
    if (!presenter.active) return;
    const pathname = location.pathname;
    const matchedIdx = STEPS.findIndex((s) => s.path.startsWith(pathname));
    if (matchedIdx !== -1 && matchedIdx !== presenter.step) {
      setPresenterStep(matchedIdx);
    }
  }, [location.pathname, presenter.active, presenter.step, setPresenterStep]);

  // Autoplay progression effect: when current step is done, wait 3s and advance
  useEffect(() => {
    if (!presenter.active || !presenter.autoplay) {
      clearAutoTimer();
      return;
    }

    if (presenter.step === 4) {
      // Reached final playbook step, halt autoplay
      clearAutoTimer();
      toggleAutoplay();
      return;
    }

    if (currentStepDone) {
      clearAutoTimer();
      autoTimerRef.current = window.setTimeout(() => {
        handleNext();
      }, 3000);
    }

    return () => {
      clearAutoTimer();
    };
  }, [
    presenter.active,
    presenter.autoplay,
    presenter.step,
    currentStepDone,
    clearAutoTimer,
    handleNext,
    toggleAutoplay,
  ]);

  // Pause work when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearAutoTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [clearAutoTimer]);

  // Global keyboard shortcuts (Shift+D to toggle, Arrows/Space/Esc when active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isInput) return;

      // Shift + D toggles Presenter Mode
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        if (presenter.active) {
          handleExit();
        } else {
          startPresenter();
          navigate('/job?demo=1');
        }
        return;
      }

      if (!presenter.active) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleAutoplay();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    presenter.active,
    handleExit,
    startPresenter,
    navigate,
    handleNext,
    handlePrev,
    toggleAutoplay,
  ]);

  const progressScale = useMemo(() => {
    return (presenter.step + 1) / 5;
  }, [presenter.step]);

  if (!presenter.active) {
    return null;
  }

  return (
    <aside
      aria-label="Presenter Mode Conductor"
      className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[720px] z-40 bg-[#0A0A0A] text-white rounded-[20px] shadow-2xl border border-white/10 flex flex-col overflow-hidden will-change-transform"
      style={{
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Top scaleX progress line */}
      <div className="w-full h-[2.5px] bg-white/10 relative overflow-hidden">
        <div
          className="h-full bg-[#0037FF] transition-transform duration-300 ease-out origin-left"
          style={{ transform: `scaleX(${progressScale})` }}
        />
      </div>

      {/* Screen-reader announcement */}
      <div className="sr-only" aria-live="polite">
        {`Presenter Step ${presenter.step + 1} of 5: ${STEPS[presenter.step].label} ${STEPS[presenter.step].name
          }`}
      </div>

      {/* Main Bar Content */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col gap-2">
        {/* Steps row */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STEPS.map((s) => {
            const isCurrent = presenter.step === s.id;
            const isDone = isStepDone(s.id);

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(s.id)}
                aria-label={`Jump to step ${s.label} ${s.name}${isDone ? ' (Completed)' : ''}`}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer select-none shrink-0 ${isCurrent
                  ? 'bg-white text-[#0A0A0A] font-bold shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10 font-medium'
                  }`}
              >
                <span>{s.label}</span>
                <span className="hidden xs:inline">{s.name}</span>
                {isDone && (
                  <Check
                    className={`w-3 h-3 ${isCurrent ? 'text-[#0A0A0A]' : 'text-[#10B981]'}`}
                    strokeWidth={2.5}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs font-mono">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={presenter.step === 0}
              aria-label="Previous Step"
              className="px-2 sm:px-3 py-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PREV</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={presenter.step === 4}
              aria-label="Next Step"
              className="px-2 sm:px-3 py-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="hidden sm:inline">NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleAutoplay}
              aria-label={presenter.autoplay ? 'Pause Auto-Play' : 'Start Auto-Play'}
              className={`px-2.5 sm:px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${presenter.autoplay
                ? 'bg-[#0037FF] text-white font-semibold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
              {presenter.autoplay ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>AUTO-PLAY</span>
                </>
              )}
            </button>
          </div>

          {/* Reset and Exit */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset Demo Run"
              className="px-2 sm:px-2.5 py-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset Demo Run"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">RESET</span>
            </button>

            <button
              type="button"
              onClick={handleExit}
              aria-label="Exit Presenter Mode"
              className="px-2 sm:px-2.5 py-1 rounded-md text-white/60 hover:text-[#EF4444] hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              title="Exit Presenter Mode (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});

DemoConductor.displayName = 'DemoConductor';
