import React from 'react';
import type { ShieldId, ShieldResult, ShieldCardStatus, RiskLevel } from '../../types/analysis';
import { MonoLabel } from '../ui/MonoLabel';
import { BigNumber } from '../ui/BigNumber';
import { ArrowLink } from '../ui/ArrowLink';

export interface ShieldCardProps {
  id: ShieldId;
  name: string;
  dotColor: string;
  route: string;
  checksDescription: string;
  status: ShieldCardStatus;
  result?: ShieldResult;
}

const levelColors: Record<RiskLevel, string> = {
  low: '#16A34A',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#E11D2E',
};

export const ShieldCard: React.FC<ShieldCardProps> = React.memo(({
  name,
  dotColor,
  route,
  checksDescription,
  status,
  result,
}) => {
  const isScanning = status === 'scanning';
  const hasResult = status === 'done' && !!result;
  const isIdle = !isScanning && !hasResult;

  // Status label and color
  let statusText = 'IDLE';
  let statusColor: 'muted' | 'accent' | 'ink' = 'muted';
  let customStatusColor: string | undefined;

  if (isScanning) {
    statusText = 'SCANNING...';
    statusColor = 'accent';
  } else if (hasResult && result) {
    if (result.level === 'low') {
      statusText = 'CLEAR';
      customStatusColor = '#16A34A';
    } else {
      statusText = 'THREAT DETECTED';
      customStatusColor = levelColors[result.level] || '#E11D2E';
    }
  }

  const riskValue = hasResult && result ? result.risk : null;
  const riskLevel = result?.level || 'low';
  const barColor = hasResult ? levelColors[riskLevel] : '#0037FF';
  const scalePercent = hasResult && riskValue !== null ? Math.min(riskValue / 100, 1) : 0;

  return (
    <div className="relative bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col justify-between min-h-[320px] sm:min-h-[340px] overflow-hidden transition-colors">
      <div>
        {/* Card Header: Wordmark and Colored Dot */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Inter_Tight'] font-bold text-2xl sm:text-3xl tracking-tight text-[#0A0A0A] lowercase">
            {name}
          </h2>
          <span
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
        </div>

        {/* 2px Solid Rule */}
        <div className="w-full h-[2px] bg-[#0A0A0A] mb-6" />

        {/* Status Badge & Label */}
        <div className="flex items-center justify-between mb-4">
          {customStatusColor ? (
            <span
              className="font-mono-label text-xs font-semibold tracking-wider"
              style={{ color: customStatusColor }}
            >
              {statusText}
            </span>
          ) : (
            <MonoLabel color={statusColor} className="text-xs font-semibold">
              {statusText}
            </MonoLabel>
          )}

          {hasResult && result?.confidence && (
            <span className="font-mono-label text-[11px] text-[#6B6F76]">
              {Math.round(result.confidence * 100)}% CONFIDENCE
            </span>
          )}
        </div>

        {/* Big Risk Number Display */}
        <div className="mb-4">
          {hasResult && riskValue !== null ? (
            <div className="flex items-baseline gap-1.5">
              <BigNumber value={riskValue} size="giant" animate={true} duration={1.0} />
              <span className="font-mono-label text-xs text-[#6B6F76] font-medium">
                /100 RISK
              </span>
            </div>
          ) : isScanning ? (
            <div className="h-[90px] flex items-center">
              <span className="font-['Inter_Tight'] text-4xl sm:text-5xl font-light text-[#0037FF] animate-pulse">
                ANALYZING...
              </span>
            </div>
          ) : (
            <div className="h-[90px] flex items-baseline gap-2">
              <span className="font-['Inter_Tight'] text-6xl sm:text-7xl font-light text-[#0A0A0A]/30">
                --
              </span>
              <span className="font-mono-label text-xs text-[#6B6F76]">
                STANDBY
              </span>
            </div>
          )}
        </div>

        {/* Risk Progress Bar / Scanning Shimmer */}
        <div className="w-full h-[4px] rounded-full bg-[#0A0A0A]/10 overflow-hidden relative mb-4">
          {isScanning ? (
            <div
              className="absolute inset-0 bg-[#0037FF] rounded-full scan-shimmer-bar"
              style={{ width: '45%' }}
            />
          ) : (
            <div
              className="h-full rounded-full transition-transform duration-700 ease-out origin-left"
              style={{
                backgroundColor: barColor,
                transform: `scaleX(${scalePercent})`,
              }}
            />
          )}
        </div>

        {/* What it checks line */}
        <p className="text-xs sm:text-sm text-[#6B6F76] font-['Inter_Tight'] leading-relaxed">
          {checksDescription}
        </p>
      </div>

      {/* Footer Link */}
      <div className="pt-6 border-t border-[#0A0A0A]/10 mt-6 flex justify-between items-center">
        <span className="font-mono-label text-[11px] text-[#6B6F76]">
          {isIdle ? 'READY' : isScanning ? 'INSPECTION IN PROGRESS' : `${riskLevel.toUpperCase()} LEVEL`}
        </span>
        <ArrowLink to={route} size="sm">
          OPEN SHIELD
        </ArrowLink>
      </div>
    </div>
  );
});

ShieldCard.displayName = 'ShieldCard';
