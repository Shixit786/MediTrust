import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { ShieldCard } from './ShieldCard';

export const ShieldStatusCards: React.FC = React.memo(() => {
  const voiceResult = useAnalysisStore((s) => s.shieldResults.voice);
  const jobResult = useAnalysisStore((s) => s.shieldResults.job);
  const simResult = useAnalysisStore((s) => s.shieldResults.sim);

  const voiceStatus = useAnalysisStore((s) => s.shieldStatus.voice);
  const jobStatus = useAnalysisStore((s) => s.shieldStatus.job);
  const simStatus = useAnalysisStore((s) => s.shieldStatus.sim);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
      {/* Voice Shield */}
      <ShieldCard
        id="voice"
        name="voice·shield"
        dotColor="#3B5BFF"
        route="/voice"
        checksDescription="Deepfake audio · 9 spectral acoustic features"
        status={voiceStatus}
        result={voiceResult}
      />

      {/* Job Shield */}
      <ShieldCard
        id="job"
        name="job·shield"
        dotColor="#F5B800"
        route="/job"
        checksDescription="WhatsApp & PDF scams · 6 threat feeds · MCA21"
        status={jobStatus}
        result={jobResult}
      />

      {/* SIM Guard */}
      <ShieldCard
        id="sim"
        name="sim·guard"
        dotColor="#FF4FA3"
        route="/sim"
        checksDescription="Carrier telemetry · SIM swap defense · OTP radar"
        status={simStatus}
        result={simResult}
      />
    </div>
  );
});

ShieldStatusCards.displayName = 'ShieldStatusCards';
