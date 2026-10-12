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

export interface FusionContribution {
  shield: ShieldId;
  name: string;
  risk: number;
  threat: string;
  weight: number;
  status: 'detected' | 'weak_signal' | 'not_available';
}

export interface FusionCorrelation {
  id: string;
  title: string;
  description: string;
  matched: boolean;
  shields: ShieldId[];
}

export interface FusionChainStep {
  stepNumber: number;
  title: string;
  shield: ShieldId | 'fusion';
  color: string;
  status: 'DETECTED' | 'NOT DETECTED' | 'PREDICTED';
  score?: number;
  evidence: string[];
  predictedNote?: string;
}

export interface FusionResult {
  overall_risk: number;
  level: RiskLevel;
  pattern: string;
  attack_chain: { step: string; shield: ShieldId }[];
  explanation: string;
  actions: string[];
  explanation_en?: string;
  explanation_hi?: string;
  confidence?: number;
  contributions?: FusionContribution[];
  correlations?: FusionCorrelation[];
  chain_steps?: FusionChainStep[];
  matched_patterns?: string[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g. "12:15:30"
  dateFormatted: string; // e.g. "Oct 10, 2026"
  shield: 'voice' | 'job' | 'sim' | 'fusion';
  risk: number;
  level: RiskLevel;
  threat: string;
  summary: string;
}

export type BlobTone = 'idle' | 'low' | 'medium' | 'high' | 'critical';
export type ShieldCardStatus = 'idle' | 'scanning' | 'done';
export type DemoStatus = 'idle' | 'running' | 'done';

export interface ThreatFeedItem {
  id: string;
  timestamp: string;
  shield: ShieldId | 'fusion' | 'system';
  message: string;
  severity: RiskLevel;
}

// Job Shield Specific Types
export type SourceCheckStatus = 'checking' | 'clean' | 'suspicious' | 'flagged';

export interface SourceCheck {
  name: string;
  status: 'clean' | 'suspicious' | 'flagged';
}

export interface ExtractedUrlAnalysis {
  url: string;
  verdict: 'clean' | 'suspicious' | 'phishing' | 'malicious';
  sources: SourceCheck[];
  reasons: string[];
}

export interface RedFlagItem {
  category: string;
  title: string;
  detail: string;
  healthcare: boolean;
}

export interface TextHighlight {
  start: number;
  end: number;
  phrase: string;
  category: 'urgency' | 'payment' | 'otp' | 'salary' | 'link' | 'personal';
  reason: string;
}

export interface CompanyCheckItem {
  label: string;
  status: 'match' | 'mismatch' | 'not_found';
}

export interface CompanyAnalysis {
  name: string;
  checks: CompanyCheckItem[];
}

export interface AiScamAnalysis {
  summary_en: string;
  summary_hi?: string;
  patterns: string[];
  confidence: number;
}

export interface JobShieldResult extends ShieldResult {
  extracted_text: string;
  urls: ExtractedUrlAnalysis[];
  red_flags: RedFlagItem[];
  highlights: TextHighlight[];
  company: CompanyAnalysis;
  ai: AiScamAnalysis;
}

// Voice Shield Specific Types
export type FeatureStatus = 'normal' | 'suspicious' | 'anomalous';

export interface VoiceFeature {
  id: string;
  name: string;
  whatItCatches: string;
  value: number;
  score: number;
  status: FeatureStatus;
  note: string;
}

export interface VoiceAnomaly {
  t_start: number;
  t_end: number;
  feature: string;
  reason: string;
}

export interface VoiceAiAnalysis {
  summary_en: string;
  summary_hi?: string;
  why_matters: string;
  patterns: string[];
  confidence: number;
}

export interface VoiceShieldResult extends ShieldResult {
  duration_sec: number;
  features: VoiceFeature[];
  anomalies: VoiceAnomaly[];
  peaks: number[];
  ai: VoiceAiAnalysis;
}

export type VoiceShieldStatus = 'idle' | 'analyzing' | 'done' | 'error';
export type VoiceSource = 'upload' | 'record' | 'sample';

export interface VoiceInputData {
  fileName: string | null;
  source: VoiceSource | null;
  sampleId?: string | null;
  duration?: number | null;
}

// SIM Guard Specific Types
export type SimGuardStatus = 'idle' | 'normal' | 'anomaly' | 'confirmed' | 'frozen';

export interface CarrierInfo {
  provider: string;
  line_type: string;
  region: string;
  fraud_score: number;
  confidence: string;
  recent_sim_change: string;
  roaming: string;
}

export type SimEventType =
  | 'NETWORK_SCAN'
  | 'BASELINE_OK'
  | 'LOCATION_JUMP'
  | 'DEVICE_SWITCH'
  | 'OTP_FLOOD'
  | 'SIM_CHANGE'
  | 'ANOMALY_SPIKE'
  | 'SWAP_CONFIRMED'
  | 'FREEZE_ENGAGED'
  | 'FREEZE_RELEASED';

export interface SimTelemetryEvent {
  id: string;
  timestamp: string; // HH:MM:SS
  type: SimEventType;
  message: string;
  severity: RiskLevel;
}

export interface SimRedFlag {
  title: string;
  detail: string;
  category: string;
}

export interface SimShieldResult extends ShieldResult {
  simNumber: string;
  status: SimGuardStatus;
  carrier: CarrierInfo;
  red_flags: SimRedFlag[];
  ai: {
    summary_en: string;
    summary_hi?: string;
    patterns: string[];
    confidence: number;
  };
}
