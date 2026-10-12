import type {
  ShieldId,
  ShieldResult,
  FusionResult,
  FusionContribution,
  FusionCorrelation,
  FusionChainStep,
  RiskLevel,
} from '../types/analysis';

export interface FusionInputs {
  job?: ShieldResult;
  voice?: ShieldResult;
  sim?: ShieldResult;
}

const NOMINAL_WEIGHTS: Record<ShieldId, number> = {
  job: 0.35,
  voice: 0.30,
  sim: 0.35,
};

function determineLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function hasKeyword(signals: { name: string; detail: string }[] | undefined, keywords: string[]): boolean {
  if (!signals || signals.length === 0) return false;
  return signals.some((sig) => {
    const text = `${sig.name} ${sig.detail}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });
}

export function evaluateFusion(inputs: Partial<Record<ShieldId, ShieldResult>>): FusionResult {
  const activeShields: ShieldId[] = [];
  const entries: { id: ShieldId; result: ShieldResult }[] = [];

  if (inputs.job) {
    activeShields.push('job');
    entries.push({ id: 'job', result: inputs.job });
  }
  if (inputs.voice) {
    activeShields.push('voice');
    entries.push({ id: 'voice', result: inputs.voice });
  }
  if (inputs.sim) {
    activeShields.push('sim');
    entries.push({ id: 'sim', result: inputs.sim });
  }

  // Edge case: No shields active
  if (entries.length === 0) {
    return {
      overall_risk: 0,
      level: 'low',
      pattern: 'No Coordinated Pattern',
      attack_chain: [],
      explanation: 'No input vectors received. Awaiting telemetry from Job Shield, Voice Shield, or SIM Guard.',
      explanation_en: 'No input vectors received. Awaiting telemetry from Job Shield, Voice Shield, or SIM Guard.',
      actions: ['Run at least one shield scan to evaluate multi-vector correlation.'],
      confidence: 0,
      contributions: [
        { shield: 'job', name: 'Job Shield', risk: 0, threat: 'Not Evaluated', weight: 0.35, status: 'not_available' },
        { shield: 'voice', name: 'Voice Shield', risk: 0, threat: 'Not Evaluated', weight: 0.30, status: 'not_available' },
        { shield: 'sim', name: 'SIM Guard', risk: 0, threat: 'Not Evaluated', weight: 0.35, status: 'not_available' },
      ],
      correlations: [],
      chain_steps: [
        { stepNumber: 1, title: 'FAKE JOB OFFER', shield: 'job', color: '#F5B800', status: 'NOT DETECTED', evidence: ['No job scan loaded'] },
        { stepNumber: 2, title: 'DEEPFAKE VOICE CALL', shield: 'voice', color: '#3B5BFF', status: 'NOT DETECTED', evidence: ['No voice scan loaded'] },
        { stepNumber: 3, title: 'SIM SWAP / DEVICE TAKEOVER', shield: 'sim', color: '#FF4FA3', status: 'NOT DETECTED', evidence: ['No carrier telemetry loaded'] },
        { stepNumber: 4, title: 'OTP THEFT / ACCOUNT TAKEOVER RISK', shield: 'fusion', color: '#0037FF', status: 'NOT DETECTED', evidence: ['Insufficient vector data to predict chain progression'] },
      ],
      matched_patterns: [],
    };
  }

  // 1. Calculate base weighted average over active shields only, renormalizing weights
  const totalNominalWeight = entries.reduce((acc, curr) => acc + NOMINAL_WEIGHTS[curr.id], 0);
  const base = entries.reduce((acc, curr) => {
    const normWeight = NOMINAL_WEIGHTS[curr.id] / totalNominalWeight;
    return acc + curr.result.risk * normWeight;
  }, 0);

  // 2. Peak = highest active score
  const peak = Math.max(...entries.map((e) => e.result.risk));

  // 3. Score = round(0.5 * base + 0.5 * peak)
  let rawScore = Math.round(0.5 * base + 0.5 * peak);

  // 4. Extra-signal bonus: +8 for each additional shield (beyond the first) whose score is >= 60
  const highRiskCount = entries.filter((e) => e.result.risk >= 60).length;
  const extraSignalBonus = highRiskCount > 1 ? (highRiskCount - 1) * 8 : 0;

  // 5. Pattern bonus: +10 when three-way chain matches (all >= 60), +5 when any two >= 60
  let patternBonus = 0;
  if (inputs.job && inputs.voice && inputs.sim && inputs.job.risk >= 60 && inputs.voice.risk >= 60 && inputs.sim.risk >= 60) {
    patternBonus = 10;
  } else if (highRiskCount >= 2) {
    patternBonus = 5;
  }

  // Clamp final score
  const overallRisk = Math.min(100, Math.max(0, rawScore + extraSignalBonus + patternBonus));
  const level = determineLevel(overallRisk);

  // 6. Pattern headline determination
  let pattern = 'No Coordinated Pattern';
  const matchedPatterns: string[] = [];

  const jobHigh = !!inputs.job && inputs.job.risk >= 60;
  const voiceHigh = !!inputs.voice && inputs.voice.risk >= 60;
  const simHigh = !!inputs.sim && inputs.sim.risk >= 60;

  if (jobHigh && voiceHigh && simHigh) {
    pattern = 'Coordinated Multi-Stage Fraud';
    matchedPatterns.push('Three-Vector Triangulation', 'Social Engineering Chain', 'Carrier Hijack Correlation');
  } else if (jobHigh && voiceHigh) {
    pattern = 'Fake Offer with Voice Impersonation';
    matchedPatterns.push('Recruitment Lure', 'Synthetic Voice Follow-up');
  } else if (jobHigh && simHigh) {
    pattern = 'Fake Offer Leading to Account Takeover';
    matchedPatterns.push('Credential Phishing', 'Carrier Telemetry Anomaly');
  } else if (voiceHigh && simHigh) {
    pattern = 'Voice Impersonation with SIM Takeover';
    matchedPatterns.push('Audio Deepfake', 'Session Hijack');
  } else if (highRiskCount === 1) {
    const highest = entries.reduce((prev, curr) => (curr.result.risk > prev.result.risk ? curr : prev), entries[0]);
    pattern = `Single-Vector Threat (${highest.result.threat})`;
    matchedPatterns.push(`Isolated ${highest.result.threat}`);
  } else if (level === 'low') {
    pattern = 'No coordinated attack pattern found';
    matchedPatterns.push('Nominal Baselines Across Scanned Vectors');
  } else {
    pattern = 'Suspicious Vector Correlation';
    matchedPatterns.push('Moderate Telemetry Variance');
  }

  // 7. Correlation rules
  const correlations: FusionCorrelation[] = [];

  // SAME LURE: job and voice both >= 60 and either mentions urgency/payment/OTP/hospital/staff
  const lureKeywords = ['urgency', 'payment', 'fee', 'otp', 'hospital', 'recruitment', 'staff', 'hr', 'doctor', 'nurse', 'credentials', 'deposit', 'upi'];
  const jobMentionsLure = hasKeyword(inputs.job?.signals, lureKeywords);
  const voiceMentionsLure = hasKeyword(inputs.voice?.signals, lureKeywords);
  if (jobHigh && voiceHigh && (jobMentionsLure || voiceMentionsLure)) {
    correlations.push({
      id: 'same-lure',
      title: 'SAME LURE',
      description: 'Hospital-themed job offer and a "doctor" voice call share an urgency + payment pattern.',
      matched: true,
      shields: ['job', 'voice'],
    });
  }

  // SAME TARGET WINDOW: SIM >= 60 together with another shield >= 60
  if (simHigh && (jobHigh || voiceHigh)) {
    correlations.push({
      id: 'same-target-window',
      title: 'SAME TARGET WINDOW',
      description: 'SIM anomaly started within minutes of the suspicious call and employment communication.',
      matched: true,
      shields: ['sim', jobHigh ? 'job' : 'voice'],
    });
  }

  // OTP PATH: job signals mention OTP and SIM signals mention OTP flood/change
  const otpJobKeywords = ['otp', '2fa', 'verification', 'code', 'token', 'credential'];
  const otpSimKeywords = ['otp', 'flood', 'swap', 'imsi', 'switch'];
  const jobHasOtp = hasKeyword(inputs.job?.signals, otpJobKeywords);
  const simHasOtp = hasKeyword(inputs.sim?.signals, otpSimKeywords);
  if (jobHasOtp && simHasOtp) {
    correlations.push({
      id: 'otp-path',
      title: 'OTP PATH',
      description: 'Scam message asks for OTP while OTP flooding is happening on the registered number.',
      matched: true,
      shields: ['job', 'sim'],
    });
  }

  // 8. Attack Chain Timeline steps
  const chainSteps: FusionChainStep[] = [
    {
      stepNumber: 1,
      title: 'FAKE JOB OFFER',
      shield: 'job',
      color: '#F5B800',
      status: inputs.job && inputs.job.risk >= 40 ? 'DETECTED' : 'NOT DETECTED',
      score: inputs.job?.risk,
      evidence:
        inputs.job && inputs.job.risk >= 40
          ? inputs.job.signals.slice(0, 3).map((s) => `${s.name}: ${s.detail}`)
          : ['No anomalous employment recruitment or fee demands recorded.'],
    },
    {
      stepNumber: 2,
      title: 'DEEPFAKE VOICE CALL',
      shield: 'voice',
      color: '#3B5BFF',
      status: inputs.voice && inputs.voice.risk >= 40 ? 'DETECTED' : 'NOT DETECTED',
      score: inputs.voice?.risk,
      evidence:
        inputs.voice && inputs.voice.risk >= 40
          ? inputs.voice.signals.slice(0, 3).map((s) => `${s.name}: ${s.detail}`)
          : ['No acoustic synthetic artifacts or voice cloning patterns detected.'],
    },
    {
      stepNumber: 3,
      title: 'SIM SWAP / DEVICE TAKEOVER',
      shield: 'sim',
      color: '#FF4FA3',
      status: inputs.sim && inputs.sim.risk >= 40 ? 'DETECTED' : 'NOT DETECTED',
      score: inputs.sim?.risk,
      evidence:
        inputs.sim && inputs.sim.risk >= 40
          ? inputs.sim.signals.slice(0, 3).map((s) => `${s.name}: ${s.detail}`)
          : ['No unauthorized carrier reallocation or device switch observed.'],
    },
  ];

  // Step 4: OTP THEFT / ACCOUNT TAKEOVER RISK (Fusion step)
  const detectedEarlierSteps = chainSteps.filter((s) => s.status === 'DETECTED').length;
  if (detectedEarlierSteps >= 2) {
    chainSteps.push({
      stepNumber: 4,
      title: 'OTP THEFT / ACCOUNT TAKEOVER RISK',
      shield: 'fusion',
      color: '#0037FF',
      status: 'PREDICTED',
      predictedNote: 'Likely next move: account takeover through stolen OTP.',
      evidence: [
        'Likely next move: account takeover through stolen OTP.',
        'High probability of credential hijack and clinical EHR compromise.',
      ],
    });
  } else {
    chainSteps.push({
      stepNumber: 4,
      title: 'OTP THEFT / ACCOUNT TAKEOVER RISK',
      shield: 'fusion',
      color: '#0037FF',
      status: 'NOT DETECTED',
      evidence: ['Secondary account takeover trajectory currently unsubstantiated.'],
    });
  }

  // attack_chain array for Dashboard interoperability
  const attackChain: { step: string; shield: ShieldId }[] = [];
  if (inputs.job && inputs.job.risk >= 40) {
    attackChain.push({ step: 'Fake job offer', shield: 'job' });
  }
  if (inputs.voice && inputs.voice.risk >= 40) {
    attackChain.push({ step: 'Deepfake voice call', shield: 'voice' });
  }
  if (inputs.sim && inputs.sim.risk >= 40) {
    attackChain.push({ step: 'SIM swap', shield: 'sim' });
  }
  if (detectedEarlierSteps >= 2) {
    attackChain.push({ step: 'OTP / account takeover', shield: 'sim' });
  }

  // 9. Contributions list
  const contributions: FusionContribution[] = [
    {
      shield: 'job',
      name: 'job·shield',
      risk: inputs.job ? inputs.job.risk : 0,
      threat: inputs.job ? inputs.job.threat : 'No Data',
      weight: 0.35,
      status: !inputs.job ? 'not_available' : inputs.job.risk >= 60 ? 'detected' : 'weak_signal',
    },
    {
      shield: 'voice',
      name: 'voice·shield',
      risk: inputs.voice ? inputs.voice.risk : 0,
      threat: inputs.voice ? inputs.voice.threat : 'No Data',
      weight: 0.30,
      status: !inputs.voice ? 'not_available' : inputs.voice.risk >= 60 ? 'detected' : 'weak_signal',
    },
    {
      shield: 'sim',
      name: 'sim·guard',
      risk: inputs.sim ? inputs.sim.risk : 0,
      threat: inputs.sim ? inputs.sim.threat : 'No Data',
      weight: 0.35,
      status: !inputs.sim ? 'not_available' : inputs.sim.risk >= 60 ? 'detected' : 'weak_signal',
    },
  ];

  // 10. Confidence calculation
  let confidence = 0.75;
  if (entries.length === 3) {
    const risks = entries.map((e) => e.result.risk);
    const minR = Math.min(...risks);
    const maxR = Math.max(...risks);
    if (maxR - minR < 25) {
      confidence = 0.96;
    } else {
      confidence = 0.88;
    }
  } else if (entries.length === 2) {
    confidence = Math.abs(entries[0].result.risk - entries[1].result.risk) < 30 ? 0.85 : 0.72;
  } else if (entries.length === 1) {
    confidence = 0.65;
  }

  // 11. Actions based on level
  let actions: string[] = [];
  if (level === 'critical' || level === 'high') {
    actions = [
      'Freeze account (simulated)',
      'Block suspicious activity (simulated)',
      'Alert the user',
      'Do not click links or share OTP',
      "Call the hospital's and your bank's official numbers",
    ];
  } else if (level === 'medium') {
    actions = [
      'Verify the sender independently',
      'Do not share OTP',
      'Monitor account activity',
    ];
  } else {
    actions = [
      'No action needed',
      'Stay alert for urgency or payment requests',
    ];
  }

  // 12. Reasoning templates (English only)
  let explanationEn = '';

  if (jobHigh && voiceHigh && simHigh) {
    explanationEn =
      'High-confidence multi-vector attack detected targeting healthcare staff credentials. Attacker initiated contact via fake hospital recruitment offer, followed up with a cloned voice call impersonating HR, and executed a SIM swap to intercept secondary 2FA verification tokens.';
  } else if (jobHigh && voiceHigh) {
    explanationEn =
      'Coordinated recruitment phishing detected. The attacker deployed a fake hospital vacancy offer and followed up with synthetic voice impersonation to validate fake credentials.';
  } else if (jobHigh && simHigh) {
    explanationEn =
      'Account takeover vector identified. Fraudulent recruitment lure coincided with carrier-level SIM anomaly, indicating an attempt to harvest credentials and bypass 2FA.';
  } else if (voiceHigh && simHigh) {
    explanationEn =
      'Targeted social engineering vector detected. Deepfake voice communication combined with carrier anomalies points to an active session hijack attempt.';
  } else if (highRiskCount === 1) {
    const highest = entries.reduce((prev, curr) => (curr.result.risk > prev.result.risk ? curr : prev), entries[0]);
    explanationEn = `Single-vector threat identified from ${highest.result.threat} (${highest.result.risk}/100). While other monitored vectors exhibit baseline telemetry, elevated caution is advised for this isolated signal.`;
  } else if (level === 'low') {
    explanationEn =
      'No coordinated attack pattern detected across evaluated vectors. Shield indicators remain within nominal baselines. Low scores do not guarantee safety. Stay alert.';
  } else {
    explanationEn =
      'Moderate vector correlation observed. While indicators do not match an aggressive takeover pattern, suspicious telemetry warrants independent confirmation.';
  }

  return {
    overall_risk: overallRisk,
    level,
    pattern,
    attack_chain: attackChain,
    explanation: explanationEn,
    explanation_en: explanationEn,
    actions,
    confidence,
    contributions,
    correlations,
    chain_steps: chainSteps,
    matched_patterns: matchedPatterns,
  };
}
