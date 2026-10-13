import React, { useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { MagneticButton } from '../ui/MagneticButton';
import {
  runDemoAttack,
  cancelDemoAttack,
  resetDemoAttackSequence,
} from '../../services/demoAttack';
import { ArrowUpRight } from 'lucide-react';

export const DemoControlsBar: React.FC = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const demoStatus = useAnalysisStore((s) => s.demoStatus);
  const isDemoAttackRunning = useAnalysisStore((s) => s.isDemoAttackRunning);

  const handleReset = useCallback(() => {
    resetDemoAttackSequence();
    if (searchParams.get('demo')) {
      const next = new URLSearchParams(searchParams);
      next.delete('demo');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleRunDemo = useCallback(() => {
    runDemoAttack({
      speed: 1.0,
    });
  }, []);

  // Support URL parameter ?demo=1
  useEffect(() => {
    if (searchParams.get('demo') === '1' && demoStatus === 'idle') {
      const autoTimer = window.setTimeout(() => {
        handleRunDemo();
      }, 500);
      return () => clearTimeout(autoTimer);
    }
  }, [searchParams, demoStatus, handleRunDemo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelDemoAttack();
    };
  }, []);

  return (
    <div className="w-full border-t border-b border-[#0A0A0A] py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left indicator */}
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
        <MonoLabel color="ink" className="text-xs sm:text-sm font-semibold tracking-wider">
          SEE THE WHOLE ATTACK CHAIN
        </MonoLabel>
        <span className="text-xs font-mono text-[#6B6F76]">· SIMULATED SCENARIO</span>
      </div>

      {/* Right controls */}
      <div className="flex flex-wrap items-center gap-4">
        {demoStatus !== 'idle' && (
          <button
            type="button"
            onClick={handleReset}
            className="font-mono-label text-xs text-[#6B6F76] hover:text-[#0A0A0A] transition-colors uppercase cursor-pointer bg-transparent border-none p-2"
          >
            [ RESET STATE ]
          </button>
        )}

        {demoStatus === 'done' && (
          <button
            type="button"
            onClick={() => navigate('/fusion')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] bg-[#0037FF] text-white text-xs font-mono font-semibold tracking-wider hover:bg-[#002bd6] transition-colors cursor-pointer"
          >
            <span>OPEN FUSION REPORT</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}

        <MagneticButton
          onClick={handleRunDemo}
          disabled={isDemoAttackRunning}
          variant="primary"
          size="md"
          className="rounded-[16px] text-xs sm:text-sm"
        >
          {isDemoAttackRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              RUNNING ATTACK SIMULATION...
            </span>
          ) : (
            'RUN DEMO ATTACK'
          )}
        </MagneticButton>
      </div>
    </div>
  );
});

DemoControlsBar.displayName = 'DemoControlsBar';
