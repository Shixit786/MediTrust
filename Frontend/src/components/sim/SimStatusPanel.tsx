import React, { useMemo } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import type { SimGuardStatus } from '../../types/analysis';
import { ShieldCheck, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

interface SimStatusPanelProps {
  status: SimGuardStatus;
  integrity: number;
  integrityHistory: number[]; // up to 40 data points (0..100)
}

const STATUS_CONFIG = {
  idle: {
    label: 'STANDBY',
    bg: 'bg-[#F0F0F0]',
    text: 'text-[#6B6F76]',
    border: 'border-[#0A0A0A]/20',
    dot: 'bg-[#6B6F76]',
    icon: ShieldCheck,
  },
  normal: {
    label: 'NORMAL',
    bg: 'bg-[#10B981]/10',
    text: 'text-[#059669]',
    border: 'border-[#10B981]/30',
    dot: 'bg-[#10B981]',
    icon: ShieldCheck,
  },
  anomaly: {
    label: 'ANOMALY DETECTED',
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#D97706]',
    border: 'border-[#F59E0B]/30',
    dot: 'bg-[#F59E0B]',
    icon: AlertTriangle,
  },
  confirmed: {
    label: 'SIM SWAP CONFIRMED',
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    border: 'border-[#EF4444]/30',
    dot: 'bg-[#EF4444]',
    icon: ShieldAlert,
  },
  frozen: {
    label: 'FROZEN',
    bg: 'bg-[#0A0A0A] text-white',
    text: 'text-white',
    border: 'border-[#0A0A0A]',
    dot: 'bg-[#FF4FA3]',
    icon: Lock,
  },
};

export const SimStatusPanel: React.FC<SimStatusPanelProps> = React.memo(
  ({ status, integrity, integrityHistory }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
    const Icon = config.icon;

    // Build SVG sparkline path (max 40 points, width 280, height 50)
    const sparklinePath = useMemo(() => {
      const points = integrityHistory.slice(-40);
      if (points.length < 2) {
        return 'M 0 10 L 280 10';
      }

      const w = 280;
      const h = 50;
      const stepX = w / (points.length - 1);

      return points
        .map((val, idx) => {
          const x = idx * stepX;
          // val is 0..100, invert to SVG Y (100 -> top padding 5, 0 -> height-5)
          const y = h - ((val - 10) / 90) * (h - 10) - 5;
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    }, [integrityHistory]);

    // Threat level ratio: 1 - integrity / 100
    const threatRatio = Math.max(0.04, Math.min(1, (100 - integrity) / 100));

    return (
      <div
        className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col justify-between"
        aria-live="polite"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A] mb-6">
            <MonoLabel color="accent">NETWORK INTEGRITY</MonoLabel>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border ${config.bg} ${config.text} ${config.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${config.dot}`} />
              <Icon className="w-3.5 h-3.5" />
              <span>{config.label}</span>
            </div>
          </div>

          {/* Large Thin Percentage */}
          <div className="flex items-baseline gap-1 my-2">
            <span className="text-5xl sm:text-6xl md:text-7xl font-light font-['Inter_Tight'] tracking-tight text-[#0A0A0A]">
              {integrity}
            </span>
            <span className="text-3xl sm:text-4xl font-light text-[#6B6F76]">%</span>
          </div>

          <div className="font-mono-label text-[11px] text-[#6B6F76] uppercase tracking-wider mb-6">
            REAL-TIME CELLULAR SIGNAL CONSISTENCY
          </div>

          {/* Sparkline of last 40 readings (SVG with no animation loop) */}
          <div className="p-3 rounded-xl bg-[#F0F0F0]/50 border border-[#0A0A0A]/10 mb-6">
            <div className="text-[10px] font-mono-label text-[#6B6F76] uppercase mb-1 flex justify-between">
              <span>HISTORICAL TELEMETRY INTEGRITY</span>
              <span>LAST {Math.min(40, integrityHistory.length)} SAMPLES</span>
            </div>
            <div className="w-full h-14 flex items-center justify-center">
              <svg
                viewBox="0 0 280 50"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke={status === 'confirmed' || status === 'frozen' ? '#EF4444' : status === 'anomaly' ? '#F59E0B' : '#FF4FA3'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* THREAT LEVEL Bar (transform scaleX) */}
        <div className="pt-4 border-t border-[#0A0A0A]/10">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-[#6B6F76]">THREAT LEVEL</span>
            <span className="text-[#0A0A0A] font-bold">
              {Math.round(threatRatio * 100)}%
            </span>
          </div>

          <div className="w-full h-2 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-transform duration-300"
              style={{
                backgroundColor:
                  threatRatio >= 0.6 ? '#EF4444' : threatRatio >= 0.25 ? '#F59E0B' : '#10B981',
                transform: `scaleX(${threatRatio})`,
                transformOrigin: 'left',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

SimStatusPanel.displayName = 'SimStatusPanel';
