/**
 * Pure function: Deterministic containment playbook and response protocol generation.
 * Generates 3-8 ordered action directives tailored to the active threat vectors.
 */

export function buildPlaybook({
  inputs = {},
  fusedRisk = 0,
  level = 'low',
} = {}) {
  const { job, voice, sim } = inputs;
  const steps = [];

  const voiceActive = Boolean(voice && voice.risk >= 30);
  const jobActive = Boolean(job && job.risk >= 30);
  const simActive = Boolean(sim && sim.risk >= 30);
  const emergencyClaimDetected = Boolean(job?.emergency_claim?.detected);

  // 1. Core Universal Directive (Always Present)
  steps.push({
    id: 'otp_pin_guard',
    order: 1,
    priority: 'now',
    title: 'Do not share OTP, PIN or CVV with anyone',
    detail:
      'Legitimate employers, hospitals, and bank staff will never demand one-time verification passcodes or security credentials.',
    shield: 'general',
  });

  // 2. Relative Emergency Verification
  if (emergencyClaimDetected) {
    steps.push({
      id: 'verify_relative_direct',
      order: steps.length + 1,
      priority: 'now',
      title: 'Call the relative directly on a number you already know before sending any money',
      detail:
        'Verify the medical emergency claim directly through family or the hospital front desk using known saved numbers.',
      shield: 'job',
    });
  }

  // 3. Voice Call Interruption
  if (voiceActive) {
    steps.push({
      id: 'voice_call_back',
      order: steps.length + 1,
      priority: 'now',
      title: 'End the call and call back on an official number',
      detail:
        'Hang up immediately. Look up the organization landline independently and verify the caller identity.',
      shield: 'voice',
    });
  }

  // 4. Job Offer Fee Refusal
  if (jobActive) {
    steps.push({
      id: 'job_fee_refusal',
      order: steps.length + 1,
      priority: 'now',
      title: "Do not pay any fee or share documents until verified on the employer's official site",
      detail:
        'Genuine healthcare employers do not require registration charges, interview fees, uniform deposits, or training fees.',
      shield: 'job',
    });
  }

  // 5. SIM Carrier Freeze (Simulated)
  if (simActive) {
    steps.push({
      id: 'sim_freeze_protocol',
      order: steps.length + 1,
      priority: 'now',
      title: 'Engage emergency carrier gating and lock outgoing OTP delivery',
      detail:
        'Pause SIM swap processing and outgoing OTP authentication dispatch on carrier network node.',
      shield: 'sim',
      simulated: true,
    });

    steps.push({
      id: 'sim_block_changes',
      order: steps.length + 1,
      priority: 'next',
      title: 'Contact your mobile operator from another phone and ask to block SIM changes',
      detail:
        'Inform telecom customer support of suspicious activity and request an explicit lock on subscriber porting and SIM re-allocation.',
      shield: 'sim',
    });
  }

  // 6. High/Critical Risk Escalation (fused >= 60)
  if (fusedRisk >= 60) {
    steps.push({
      id: 'bank_card_block',
      order: steps.length + 1,
      priority: 'now',
      title: "Call your bank's official helpline to block cards and UPI",
      detail:
        'Temporarily freeze net banking, UPI tokens, and debit cards to prevent unauthorized fund transfers.',
      shield: 'fusion',
    });

    steps.push({
      id: 'cybercrime_report_1930',
      order: steps.length + 1,
      priority: 'later',
      title: 'Report at the National Cyber Crime Helpline 1930 or cybercrime.gov.in',
      detail:
        'Lodge an official incident complaint with India National Cyber Crime Reporting Portal or call toll-free 1930.',
      shield: 'fusion',
    });
  }

  // Re-number orders sequentially to guarantee 1-indexed monotonic order
  steps.forEach((s, idx) => {
    s.order = idx + 1;
  });

  // Cap at 8 steps
  const finalSteps = steps.slice(0, 8);

  // Guardian Alert Configuration
  const isAlertRecommended = fusedRisk >= 60;
  const guardianAlert = {
    recommended: isAlertRecommended,
    message: isAlertRecommended
      ? `EMERGENCY NOTICE: High multi-vector fraud probability detected (Risk: ${fusedRisk}/100, Level: ${level.toUpperCase()}). Please verify account owner safety immediately. Helpline: 1930.`
      : `Advisory notice: Suspicious activity observed. Helpline: 1930.`,
    simulated: true,
  };

  return {
    steps: finalSteps,
    guardianAlert,
  };
}

export default {
  buildPlaybook,
};
