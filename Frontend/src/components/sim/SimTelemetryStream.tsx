import React from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import type { SimTelemetryEvent } from '../../types/analysis';

interface SimTelemetryStreamProps {
  events: SimTelemetryEvent[];
}

const TYPE_LABELS: Record<string, string> = {
  NETWORK_SCAN: 'SCAN',
  BASELINE_OK: 'BASELINE',
  LOCATION_JUMP: 'LOCATION',
  DEVICE_SWITCH: 'DEVICE',
  OTP_FLOOD: 'OTP BURST',
  SIM_CHANGE: 'IMSI SWAP',
  ANOMALY_SPIKE: 'ANOMALY',
  SWAP_CONFIRMED: 'CONFIRMED',
  FREEZE_ENGAGED: 'FREEZE ON',
  FREEZE_RELEASED: 'RELEASE',
};

export const SimTelemetryStream: React.FC<SimTelemetryStreamProps> = React.memo(({ events }) => {
  return (
    <div
      className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col h-full"
      aria-label="Live Telemetry Event Feed"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#0A0A0A] mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4FA3] animate-pulse" />
          <MonoLabel color="accent">LIVE TELEMETRY</MonoLabel>
        </div>

        <span className="font-mono-label text-[11px] text-[#6B6F76] uppercase tracking-wider">
          SIMULATED TELEMETRY · NO TELECOM ACCESS
        </span>
      </div>

      {/* Events List: Max 8 visible, fixed height scroll container */}
      <div
        className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-[#0A0A0A]/10 pr-1 scrollbar-thin"
        aria-live="polite"
      >
        {events.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#6B6F76]">
            WAITING FOR INITIAL TELEMETRY BURST...
          </div>
        ) : (
          events.slice(0, 40).map((ev) => {
            const isCritical = ev.severity === 'critical';
            const isHigh = ev.severity === 'high';
            const isMedium = ev.severity === 'medium';

            const chipColor = isCritical
              ? 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/20'
              : isHigh
              ? 'bg-[#F97316]/10 text-[#EA580C] border border-[#F97316]/20'
              : isMedium
              ? 'bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/20'
              : 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20';

            return (
              <div
                key={ev.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono group hover:bg-[#F0F0F0]/50 transition-colors px-1 rounded-lg"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-[#6B6F76] shrink-0 font-medium">
                    {ev.timestamp}
                  </span>

                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#0A0A0A]/5 text-[#0A0A0A] shrink-0">
                    {TYPE_LABELS[ev.type] || ev.type}
                  </span>

                  <span className="text-[#0A0A0A] font-light truncate" title={ev.message}>
                    {ev.message}
                  </span>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${chipColor}`}
                  >
                    {ev.severity}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

SimTelemetryStream.displayName = 'SimTelemetryStream';
