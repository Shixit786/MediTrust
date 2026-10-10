import React, { useState, useEffect, useRef } from 'react';
import type { ThreatFeedItem, RiskLevel } from '../../types/analysis';
import { MonoLabel } from '../ui/MonoLabel';
import { subscribeThreatFeed, subscribeThreatFeedReset } from '../../services/threatFeedEvents';

const AMBIENT_EVENTS: Omit<ThreatFeedItem, 'id' | 'timestamp'>[] = [
  { shield: 'sim', message: 'Carrier check passed: IMSI telemetry stable', severity: 'low' },
  { shield: 'job', message: 'URL reputation clean: certificate verified', severity: 'low' },
  { shield: 'voice', message: 'Audio baseline updated: 0 anomalies in environment', severity: 'low' },
  { shield: 'system', message: 'Zero telecom intrusion verified across active channels', severity: 'low' },
  { shield: 'job', message: 'MCA21 corporate registry query: normal response', severity: 'low' },
  { shield: 'voice', message: 'Acoustic background noise floor measured at 38 dB', severity: 'low' },
  { shield: 'sim', message: 'Cell tower triangulation matched primary roaming profile', severity: 'low' },
  { shield: 'system', message: 'HIPAA telemetry compliance buffer cleared', severity: 'low' },
];

const shieldColors: Record<string, string> = {
  voice: '#3B5BFF',
  job: '#F5B800',
  sim: '#FF4FA3',
  fusion: '#0037FF',
  system: '#16A34A',
};

const severityBadges: Record<RiskLevel, { text: string; bg: string; textCol: string }> = {
  low: { text: 'LOW', bg: 'rgba(22, 163, 74, 0.12)', textCol: '#16A34A' },
  medium: { text: 'MED', bg: 'rgba(245, 158, 11, 0.12)', textCol: '#D97706' },
  high: { text: 'HIGH', bg: 'rgba(249, 115, 22, 0.12)', textCol: '#EA580C' },
  critical: { text: 'CRIT', bg: 'rgba(225, 29, 46, 0.12)', textCol: '#E11D2E' },
};

function getNowTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

const INITIAL_EVENTS: ThreatFeedItem[] = [
  {
    id: 'evt-init-1',
    timestamp: getNowTimestamp(),
    shield: 'system',
    message: 'Telemetry stream initialized. Three signal modules synchronized.',
    severity: 'low',
  },
  {
    id: 'evt-init-2',
    timestamp: getNowTimestamp(),
    shield: 'voice',
    message: 'Voice Shield standby. Spectral vector engine ready for microphone/audio intake.',
    severity: 'low',
  },
  {
    id: 'evt-init-3',
    timestamp: getNowTimestamp(),
    shield: 'job',
    message: 'Job Shield standby. Threat intelligence feeds connected.',
    severity: 'low',
  },
];

export const LiveThreatStream: React.FC = React.memo(() => {
  const [events, setEvents] = useState<ThreatFeedItem[]>(INITIAL_EVENTS);
  const ambientIndexRef = useRef(0);

  useEffect(() => {
    // Subscribe to manual/demo events
    const unsubFeed = subscribeThreatFeed((newEvent) => {
      setEvents((prev) => [newEvent, ...prev].slice(0, 30));
    });

    const unsubReset = subscribeThreatFeedReset(() => {
      setEvents([
        {
          id: `evt-${Date.now()}-reset`,
          timestamp: getNowTimestamp(),
          shield: 'system',
          message: 'System state reset. Telemetry stream returned to idle baseline.',
          severity: 'low',
        },
      ]);
    });

    // Ambient background events generator
    let timerId: number | null = null;

    const scheduleNextAmbient = () => {
      const delay = 4000 + Math.random() * 2500; // 4 - 6.5 seconds
      timerId = window.setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          const poolItem = AMBIENT_EVENTS[ambientIndexRef.current % AMBIENT_EVENTS.length];
          ambientIndexRef.current += 1;

          const ambientItem: ThreatFeedItem = {
            id: `evt-ambient-${Date.now()}`,
            timestamp: getNowTimestamp(),
            shield: poolItem.shield,
            message: poolItem.message,
            severity: poolItem.severity,
          };

          setEvents((prev) => [ambientItem, ...prev].slice(0, 30));
        }
        scheduleNextAmbient();
      }, delay);
    };

    scheduleNextAmbient();

    return () => {
      unsubFeed();
      unsubReset();
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A] mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF] animate-ping" />
            <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
              LIVE THREAT STREAM
            </MonoLabel>
          </div>
          <span className="font-mono-label text-[11px] text-[#6B6F76]">
            {events.length} TELEMETRY SIGNALS LOGGED
          </span>
        </div>

        {/* Stream List (Max 8 visible with smooth scroll / slide-in) */}
        <div
          className="flex flex-col max-h-[440px] overflow-y-auto divide-y divide-[#0A0A0A]/10"
          aria-live="polite"
          aria-label="Real-time security telemetry feed"
        >
          {events.slice(0, 8).map((evt, idx) => {
            const badge = severityBadges[evt.severity] || severityBadges.low;
            const shieldDot = shieldColors[evt.shield] || '#0037FF';
            const opacityClass = idx === 0 ? 'opacity-100' : idx < 4 ? 'opacity-95' : idx < 6 ? 'opacity-80' : 'opacity-60';

            return (
              <div
                key={evt.id}
                className={`py-3.5 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-opacity duration-300 ${opacityClass}`}
                style={{
                  animation: idx === 0 ? 'laser-scan 0.3s ease-out' : 'none',
                }}
              >
                {/* Timestamp & Shield & Message */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono-label text-[11px] text-[#6B6F76] tabular-nums shrink-0">
                    {evt.timestamp}
                  </span>

                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: shieldDot }}
                    title={evt.shield.toUpperCase()}
                  />

                  <span className="font-mono-label text-[11px] uppercase text-[#0A0A0A]/40 shrink-0 font-medium hidden md:inline-block">
                    [{evt.shield}]
                  </span>

                  <span className="font-['Inter_Tight'] text-xs text-[#0A0A0A] truncate">
                    {evt.message}
                  </span>
                </div>

                {/* Severity Badge */}
                <div className="shrink-0 flex items-center self-start sm:self-auto">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded font-mono-label text-[10px] font-bold tracking-wider select-none"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.textCol,
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stream Footer */}
      <div className="pt-4 border-t border-[#0A0A0A]/10 mt-4 flex items-center justify-between text-[11px] font-mono-label text-[#6B6F76]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span>ZERO TELECOM ACCESS · SIMULATED EVENT STREAM</span>
        </div>
        <span>AUTO-INGESTION: ACTIVE</span>
      </div>
    </div>
  );
});

LiveThreatStream.displayName = 'LiveThreatStream';
