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
  summary_hi: string;
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
  summary_hi: string;
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
