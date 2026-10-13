import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { BigNumber } from '../ui/BigNumber';
import type { CarrierInfo, SimGuardStatus } from '../../types/analysis';
import { Smartphone, RefreshCw, Radio } from 'lucide-react';
import { USE_MOCK } from '../../services/api';

interface SimCarrierCardProps {
  maskedNumber: string;
  carrier: CarrierInfo;
  simStatus: SimGuardStatus;
  anomalyScore: number;
  onChangeNumber: () => void;
}

export const SimCarrierCard: React.FC<SimCarrierCardProps> = React.memo(
  ({ maskedNumber, carrier, simStatus, anomalyScore, onChangeNumber }) => {
    const isCompromised = simStatus === 'confirmed' || simStatus === 'frozen';
    const isAnomaly = simStatus === 'anomaly';

    // Dynamic fraud score: baseline score + anomaly score
    const dynamicFraudScore = isCompromised
      ? 94
      : isAnomaly
        ? Math.max(carrier.fraud_score, Math.round(carrier.fraud_score + anomalyScore * 0.7))
        : carrier.fraud_score;

    const recentSimChangeText = isCompromised
      ? 'DETECTED (SIMULATED)'
      : carrier.recent_sim_change;

    const simChangeChip = isCompromised ? 'FLAGGED' : 'CLEAN';
    const fraudScoreChip = dynamicFraudScore >= 60 ? 'FLAGGED' : dynamicFraudScore >= 30 ? 'SUSPICIOUS' : 'CLEAN';

    return (
      <section
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-10 md:p-12 mb-8 relative"
        aria-label="Carrier Node Intelligence"
      >
        {/* Pink dot top-right */}
        <span
          className="absolute top-6 right-6 w-3 h-3 rounded-full bg-[#FF4FA3]"
          aria-hidden="true"
        />

        {/* Header line with masked number and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0A0A0A] mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-[#FF4FA3]" />
              <MonoLabel color="accent">CARRIER NODE INTELLIGENCE</MonoLabel>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4FA3]/10 text-[#FF4FA3] border border-[#FF4FA3]/30">
                SIMULATED DEMO
              </span>
              {(USE_MOCK || (carrier as { _source?: string })._source === 'demo') && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30">
                  DEMO DATA
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-[#0A0A0A]" />
              <h3 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-[#0A0A0A]">
                {maskedNumber}
              </h3>
            </div>
          </div>

          <button
            onClick={onChangeNumber}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6B6F76] hover:text-[#0A0A0A] uppercase transition-colors self-start sm:self-auto py-1 px-2 rounded hover:bg-[#F0F0F0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>CHANGE NUMBER</span>
          </button>
        </div>

        {/* Carrier Details HairlineRows */}
        <div className="divide-y divide-[#0A0A0A]/10">
          {/* PROVIDER */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <span className="text-[#6B6F76] uppercase">PROVIDER</span>
              <span className="text-[#0A0A0A] font-semibold">{carrier.provider}</span>
            </div>
          </HairlineRow>

          {/* LINE TYPE */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <span className="text-[#6B6F76] uppercase">LINE TYPE</span>
              <span className="text-[#0A0A0A] font-semibold">{carrier.line_type}</span>
            </div>
          </HairlineRow>

          {/* CIRCLE / REGION */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <span className="text-[#6B6F76] uppercase">CIRCLE / REGION</span>
              <span className="text-[#0A0A0A] font-semibold">{carrier.region}</span>
            </div>
          </HairlineRow>

          {/* FRAUD SCORE with BigNumber & Bar */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-4 px-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
                <span className="text-[#6B6F76] uppercase">FRAUD SCORE</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${fraudScoreChip === 'FLAGGED'
                      ? 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20'
                      : fraudScoreChip === 'SUSPICIOUS'
                        ? 'bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/20'
                        : 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20'
                    }`}
                >
                  {fraudScoreChip}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Thin bar (transform scaleX) */}
                <div className="w-24 sm:w-36 h-2 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-transform duration-500"
                    style={{
                      backgroundColor:
                        dynamicFraudScore >= 60 ? '#EF4444' : dynamicFraudScore >= 30 ? '#F59E0B' : '#10B981',
                      transform: `scaleX(${Math.max(0.05, Math.min(1, dynamicFraudScore / 100))})`,
                      transformOrigin: 'left',
                      willChange: 'transform',
                    }}
                  />
                </div>

                <BigNumber value={dynamicFraudScore} size="sm" animate={true} className="text-[#0A0A0A]" />
              </div>
            </div>
          </HairlineRow>

          {/* CARRIER CONFIDENCE */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <span className="text-[#6B6F76] uppercase">CARRIER CONFIDENCE</span>
              <span className="text-[#0A0A0A] font-semibold">{carrier.confidence}</span>
            </div>
          </HairlineRow>

          {/* RECENT SIM CHANGE */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#6B6F76] uppercase">RECENT SIM CHANGE</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${simChangeChip === 'FLAGGED'
                      ? 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20'
                      : 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20'
                    }`}
                >
                  {simChangeChip}
                </span>
              </div>
              <span
                className={`font-semibold ${isCompromised ? 'text-[#DC2626]' : 'text-[#0A0A0A]'}`}
              >
                {recentSimChangeText}
              </span>
            </div>
          </HairlineRow>

          {/* ROAMING */}
          <HairlineRow borderTop={false} borderBottom={false} interactive={false} className="py-3 px-1">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm font-mono">
              <span className="text-[#6B6F76] uppercase">ROAMING</span>
              <span className="text-[#0A0A0A] font-semibold">{carrier.roaming}</span>
            </div>
          </HairlineRow>

          {/* Disclaimer */}
          <div className="mt-4 pt-4 border-t border-[#0A0A0A]/10 text-xs font-mono text-[#6B6F76]">
            {carrier.disclaimer || 'Simulated demo. Real SIM-swap detection needs telecom operator integration. Early warning, not proof.'}
          </div>
        </div>
      </section>
    );
  }
);

SimCarrierCard.displayName = 'SimCarrierCard';
