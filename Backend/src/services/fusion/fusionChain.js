/**
 * Pure function: Builds the 4-stage chronological attack chain reconstruction.
 *
 * Ordered stages:
 *   1. LURE (job)
 *   2. PRESSURE (voice)
 *   3. TAKEOVER (sim)
 *   4. DRAIN (predicted, not a shield)
 */

export function buildAttackChain({
  inputs = {},
  fusedRisk = 0,
  activeCount = 0,
} = {}) {
  const { job, voice, sim } = inputs;

  // Helper to extract up to 3 evidence strings from a shield's top signals
  function getEvidence(shieldData, fallbackText) {
    if (!shieldData || !Array.isArray(shieldData.signals) || shieldData.signals.length === 0) {
      return [fallbackText];
    }
    return shieldData.signals
      .slice(0, 3)
      .map((s) => (s.name && s.detail ? `${s.name}: ${s.detail}` : s.name || s.detail || fallbackText))
      .slice(0, 3);
  }

  // 1. Stage 1: LURE (Job)
  const jobPresent = Boolean(job && typeof job.risk === 'number');
  const jobActive = jobPresent && job.risk >= 30;
  const stage1Status = !jobPresent ? 'not_scanned' : jobActive ? 'detected' : 'clear';

  const stage1 = {
    id: 'lure',
    order: 1,
    stepNumber: 1,
    label: 'LURE',
    title: 'FAKE JOB OFFER / PHISHING LURE',
    shield: 'job',
    color: '#F5B800',
    status: stage1Status,
    statusUpper: jobActive ? 'DETECTED' : 'NOT DETECTED',
    risk: jobPresent ? job.risk : null,
    score: jobPresent ? job.risk : undefined,
    level: jobPresent ? job.level : null,
    evidence: getEvidence(job, 'No anomalous employment recruitment or fee demands recorded.'),
  };

  // 2. Stage 2: PRESSURE (Voice)
  const voicePresent = Boolean(voice && typeof voice.risk === 'number');
  const voiceActive = voicePresent && voice.risk >= 30;
  const stage2Status = !voicePresent ? 'not_scanned' : voiceActive ? 'detected' : 'clear';

  const stage2 = {
    id: 'pressure',
    order: 2,
    stepNumber: 2,
    label: 'PRESSURE',
    title: 'VOICE IMPERSONATION / CALL PRESSURE',
    shield: 'voice',
    color: '#3B5BFF',
    status: stage2Status,
    statusUpper: voiceActive ? 'DETECTED' : 'NOT DETECTED',
    risk: voicePresent ? voice.risk : null,
    score: voicePresent ? voice.risk : undefined,
    level: voicePresent ? voice.level : null,
    evidence: getEvidence(voice, 'No acoustic synthetic artifacts or voice cloning patterns detected.'),
  };

  // 3. Stage 3: TAKEOVER (SIM)
  const simPresent = Boolean(sim && typeof sim.risk === 'number');
  const simActive = simPresent && sim.risk >= 30;
  const stage3Status = !simPresent ? 'not_scanned' : simActive ? 'detected' : 'clear';

  const stage3 = {
    id: 'takeover',
    order: 3,
    stepNumber: 3,
    label: 'TAKEOVER',
    title: 'SIM SWAP / DEVICE TAKEOVER',
    shield: 'sim',
    color: '#FF4FA3',
    status: stage3Status,
    statusUpper: simActive ? 'DETECTED' : 'NOT DETECTED',
    risk: simPresent ? sim.risk : null,
    score: simPresent ? sim.risk : undefined,
    level: simPresent ? sim.level : null,
    evidence: getEvidence(sim, 'No unauthorized carrier reallocation or device switch observed.'),
  };

  // 4. Stage 4: DRAIN (Predicted, not a shield)
  const isDrainPredicted = stage3Status === 'detected' || fusedRisk >= 80;
  const stage4Status = isDrainPredicted ? 'predicted' : 'not_scanned';

  const stage4 = {
    id: 'drain',
    order: 4,
    stepNumber: 4,
    label: 'DRAIN',
    title: 'OTP THEFT / ACCOUNT TAKEOVER RISK',
    shield: 'fusion',
    color: '#0037FF',
    status: stage4Status,
    statusUpper: isDrainPredicted ? 'PREDICTED' : 'NOT DETECTED',
    risk: isDrainPredicted ? fusedRisk : null,
    score: isDrainPredicted ? fusedRisk : undefined,
    level: isDrainPredicted ? 'critical' : null,
    predictedNote: isDrainPredicted
      ? 'An attacker with OTP access may attempt unauthorized banking or UPI transactions.'
      : undefined,
    evidence: isDrainPredicted
      ? [
          'Likely next trajectory: account takeover through intercepted OTP.',
          'High probability of credential hijack and unauthorized transactions.',
        ]
      : ['Secondary account takeover trajectory currently unsubstantiated.'],
  };

  const stages = [stage1, stage2, stage3, stage4];

  // 5. Chain summary & next likely step (deterministic sentences)
  let summary = 'No multi-stage attack chain activity detected across evaluated vectors.';
  let nextLikelyStep = null;

  if (activeCount === 3) {
    summary =
      'Coordinated multi-vector attack detected linking recruitment phishing, voice impersonation, and SIM interception.';
  } else if (activeCount === 2) {
    summary =
      'Correlated attack progression observed across multiple communication and identity vectors.';
  } else if (activeCount === 1) {
    summary =
      'Isolated threat vector observed with no multi-stage escalation detected yet.';
  }

  if (isDrainPredicted) {
    nextLikelyStep =
      'An attacker with OTP access may attempt unauthorized banking or UPI transactions.';
  } else if (stage1Status === 'detected' && stage2Status === 'not_scanned') {
    nextLikelyStep =
      'The attacker may attempt to follow up via phone or messaging to request upfront verification fees.';
  } else if (stage2Status === 'detected' && stage3Status === 'not_scanned') {
    nextLikelyStep =
      'The caller may demand urgent credential verification or payment transfers.';
  }

  // Frontend FusionAttackChain expects steps with status: 'DETECTED' | 'NOT DETECTED' | 'PREDICTED'
  const chainSteps = stages.map((s) => ({
    stepNumber: s.stepNumber,
    title: s.title,
    shield: s.shield,
    color: s.color,
    status: s.statusUpper,
    score: typeof s.score === 'number' ? s.score : undefined,
    evidence: s.evidence,
  }));

  return {
    stages,
    chain_steps: chainSteps, // frontend compatibility
    summary,
    nextLikelyStep,
  };
}

export default {
  buildAttackChain,
};
