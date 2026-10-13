/**
 * MediTrust API Types
 * Strict contract representations matching the Node.js/Express backend responses.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ShieldName = 'job' | 'voice' | 'sim' | 'fusion';
export type ResultSource = 'live' | 'demo';

export interface WithSource {
  _source?: ResultSource;
}

export interface BackendSignal {
  name: string;
  detail: string;
  severity: RiskLevel;
}

export interface BackendErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  time: string;
  uptimeSec: number;
  env: string;
  demoMode: boolean;
  db: 'connected' | 'disconnected';
  services: {
    groq: boolean;
    nvidia: boolean;
    virustotal: boolean;
    googleSafeBrowsing: boolean;
    urlhaus: boolean;
    abuseipdb: boolean;
    securitytrails: boolean;
    ipqs: boolean;
    opencorporates: boolean;
  };
  llm: {
    groq: string;
    nvidia: string;
  };
  audio: {
    status: string;
    ffmpeg: string | null;
  };
  intel: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Job Shield
// -----------------------------------------------------------------------------
export interface JobUrlCheckSource {
  name: string;
  status: 'clean' | 'flagged' | 'suspicious' | 'checking' | 'not_checked' | 'unavailable';
}

export interface JobUrlAnalysis {
  url: string;
  verdict: 'clean' | 'suspicious' | 'phishing' | 'malicious';
  sources: JobUrlCheckSource[];
  reasons: string[];
}

export interface JobRedFlag {
  category: string;
  title: string;
  detail: string;
  healthcare: boolean;
}

export interface JobHighlight {
  start: number;
  end: number;
  phrase: string;
  category: string;
  reason: string;
}

export interface JobCompanyCheck {
  name?: string;
  label?: string;
  status: 'match' | 'mismatch' | 'suspicious' | 'not_found' | 'UNAVAILABLE' | string;
  detail?: string;
}

export interface JobCompanyVerification {
  name: string | null;
  checks: JobCompanyCheck[];
  note: string;
}

export interface JobShieldBackendResult extends WithSource {
  shield: 'job';
  risk: number;
  threat: string;
  level: RiskLevel;
  confidence: number;
  signals: BackendSignal[];
  createdAt: string;
  input_type?: 'text' | 'pdf';
  pdf?: { pages: number; info: Record<string, unknown> } | null;
  extracted_text: string;
  urls: JobUrlAnalysis[];
  red_flags: JobRedFlag[];
  highlights: JobHighlight[];
  emergency_claim?: { detected: boolean; escalated: boolean };
  company?: JobCompanyVerification;
  ai: {
    summary_en: string;
    summary_hi?: string;
    patterns: string[];
    confidence: number;
    provider: string;
  };
  scores?: {
    rules: number;
    url: number;
    llm: number;
    company: number;
    weights_used: Record<string, number>;
  };
  verdict: string;
  reliability: string;
  disclaimer: string;
  threat_intel?: {
    urls_checked: number;
    sources_reachable: string[];
    sources_unavailable: string[];
    coverage: string;
  };
  limitations?: string[];
  stages_pending?: string[];
}

// -----------------------------------------------------------------------------
// Voice Shield
// -----------------------------------------------------------------------------
export interface VoiceFeatureItem {
  id: string;
  name: string;
  whatItCatches: string;
  value: number;
  score: number;
  status: 'normal' | 'suspicious' | 'anomalous';
  note: string;
}

export interface VoiceAnomalyItem {
  t_start: number;
  t_end: number;
  feature: string;
  reason: string;
}

export interface VoiceShieldBackendResult extends WithSource {
  shield: 'voice';
  risk: number;
  threat: string;
  level: RiskLevel;
  confidence: number;
  duration_sec: number;
  signals: BackendSignal[];
  features: VoiceFeatureItem[];
  anomalies: VoiceAnomalyItem[];
  peaks: number[];
  ai: {
    summary_en: string;
    summary_hi: string;
    why_matters: string;
    patterns: string[];
    confidence: number;
  };
}

// -----------------------------------------------------------------------------
// SIM Guard
// -----------------------------------------------------------------------------
export interface SimTelemetryEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: RiskLevel;
  weight?: number;
}

export interface SimBackendResult extends WithSource {
  phoneMasked: string;
  simNumber: string;
  status: 'idle' | 'normal' | 'anomaly' | 'confirmed' | 'frozen' | 'MONITORING';
  riskScore: number;
  level: RiskLevel;
  threat: string;
  simulated: boolean;
  disclaimer: string;
  events?: SimTelemetryEvent[];
  guardian?: {
    notified: boolean;
    at?: string;
    phoneMasked?: string;
  } | null;
}

// -----------------------------------------------------------------------------
// Fusion Engine
// -----------------------------------------------------------------------------
export interface CompactShieldIn {
  risk: number;
  level?: RiskLevel;
  threat?: string;
  confidence?: number;
  signals?: BackendSignal[];
  emergency_claim?: { detected: boolean; escalated: boolean };
  frozen?: boolean;
}

export interface FusionEvaluatePayload {
  voice?: CompactShieldIn;
  job?: CompactShieldIn;
  sim?: CompactShieldIn;
}

export interface FusionChainStep {
  stepNumber: number;
  title: string;
  shield: ShieldName;
  color: string;
  status: 'DETECTED' | 'NOT DETECTED' | 'PREDICTED';
  score?: number;
  evidence: string[];
  predictedNote?: string;
}

export interface PlaybookStepItem {
  step: number;
  title: string;
  detail: string;
  urgency: string;
  simulated?: boolean;
}

export interface FusionBackendResult extends WithSource {
  shield: 'fusion';
  risk: number;
  threat: string;
  level: RiskLevel;
  confidence: number;
  signals: BackendSignal[];
  createdAt: string;
  coverage: 'single' | 'partial' | 'full';
  chain: {
    stages: unknown[];
    chain_steps: FusionChainStep[];
    summary: string;
    nextLikelyStep: string;
  };
  chain_steps: FusionChainStep[];
  playbook: {
    steps: PlaybookStepItem[];
    guardianAlert: {
      recommended: boolean;
      message: string;
      simulated: boolean;
    };
  };
  actions: string[];
  guardianAlert: {
    recommended: boolean;
    message: string;
    simulated: boolean;
  };
  ai: {
    summary_en: string;
    provider: string;
  };
  explanation: string;
  overall_risk: number;
  pattern: string;
  disclaimer: string;
  simulated_components: string[];
}

// -----------------------------------------------------------------------------
// Incident Report
// -----------------------------------------------------------------------------
export interface IncidentReportPayload {
  voice?: CompactShieldIn;
  job?: CompactShieldIn;
  sim?: CompactShieldIn;
  incidentNote?: string | null;
}

export interface IncidentReportBackendResult extends WithSource {
  title: string;
  generatedAt: string;
  fused: {
    risk: number;
    level: string;
    threat: string;
  };
  timeline: Array<{
    order: number;
    label: string;
    title: string;
    shield: string;
    status: string;
  }>;
  indicators: unknown[];
  actionsRecommended: string[];
  reportTo: Array<{
    name: string;
    url?: string;
    contact?: string;
  }>;
  evidenceChecklist: string[];
  markdown: string;
  disclaimer: string;
}

// -----------------------------------------------------------------------------
// History
// -----------------------------------------------------------------------------
export interface HistoryStatsResponse extends WithSource {
  totalScans: number;
  byShield: Record<string, number>;
  byLevel: Record<string, number>;
  avgRisk: number;
  last7Days: Array<{ date: string; count: number; avgRisk: number }>;
  topThreats: Array<{ threat: string; count: number }>;
  db: 'connected' | 'disconnected';
  note: string;
}

export interface RecentScanItem {
  id: string;
  shield: ShieldName;
  risk: number;
  level: RiskLevel;
  threat: string;
  createdAt: string;
}
