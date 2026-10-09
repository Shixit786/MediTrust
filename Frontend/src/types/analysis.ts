export type ShieldId = 'voice' | 'job' | 'sim';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Signal {
  name: string;
  detail: string;
  severity: RiskLevel;
}

export interface ShieldResult {
  shield: ShieldId;
  risk: number;
  threat: string;
  level: RiskLevel;
  confidence?: number;
  signals: Signal[];
}

export interface FusionResult {
  overall_risk: number;
  level: RiskLevel;
  pattern: string;
  attack_chain: { step: string; shield: ShieldId }[];
  explanation: string;
  actions: string[];
}

export type BlobTone = 'idle' | 'low' | 'medium' | 'high' | 'critical';
