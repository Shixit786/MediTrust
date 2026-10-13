import type { ShieldId, ShieldResult, FusionResult } from '../../types/analysis';
import type { ChatShieldResultContext, ChatContextIn } from '../../lib/api/chat';

/**
 * Privacy-first context extractor.
 * Extracts strictly non-sensitive telemetry:
 * Only: shield, risk (0-100), level, threat, and up to 3 signal names.
 * NEVER includes: raw text, URLs, file names, audio buffers, phone numbers, or guardian contacts.
 */

export interface ExtractedContext {
  context: ChatContextIn;
  label: string; // e.g., "JOB RESULT" or "VOICE RESULT"
}

export function extractSafeShieldContext(
  shieldResults: Partial<Record<ShieldId, ShieldResult>>,
  fusionResult: FusionResult | null,
  currentPath?: string
): ExtractedContext | null {
  const results: ChatShieldResultContext[] = [];
  let primaryLabel = 'SCAN RESULT';

  // If Fusion result exists, prioritize it
  if (fusionResult) {
    primaryLabel = 'FUSION INCIDENT';
    results.push({
      shield: 'fusion',
      risk: Math.max(0, Math.min(100, Math.round(fusionResult.overall_risk))),
      level: fusionResult.level,
      threat: String(fusionResult.pattern || 'Multi-Vector Incident').slice(0, 80),
      signals: (fusionResult.attack_chain || [])
        .slice(0, 3)
        .map((s) => String(s.step).slice(0, 60)),
    });
  }

  // Check individual shields
  const order: ShieldId[] = ['voice', 'job', 'sim'];
  for (const id of order) {
    const res = shieldResults[id];
    if (res && typeof res.risk === 'number') {
      if (!fusionResult && results.length === 0) {
        primaryLabel = `${id.toUpperCase()} RESULT`;
      }
      results.push({
        shield: id,
        risk: Math.max(0, Math.min(100, Math.round(res.risk))),
        level: res.level,
        threat: String(res.threat || 'Threat Detected').slice(0, 80),
        signals: (res.signals || [])
          .slice(0, 3)
          .map((s) => String(s.name || '').slice(0, 60)),
      });
    }
  }

  if (results.length === 0) {
    return null;
  }

  return {
    context: {
      page: currentPath,
      results: results.slice(0, 4),
    },
    label: primaryLabel,
  };
}
