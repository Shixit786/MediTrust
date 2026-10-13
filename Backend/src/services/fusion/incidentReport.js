import { FUSION_CONFIG } from './fusionRules.js';

/**
 * Sanitizes optional user incident notes (strips control characters, caps to 500 chars).
 */
export function sanitizeIncidentNote(note) {
  if (!note || typeof note !== 'string') return null;
  // Strip non-printable ASCII and control characters except basic newlines/spaces
  const cleaned = note
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 500);
  return cleaned || null;
}

/**
 * Builds the structured incident report and Markdown document.
 */
export function buildIncidentReport({
  fusedRisk = 0,
  level = 'low',
  threat = 'No Coordinated Fraud Pattern',
  chainStages = [],
  signals = [],
  playbookSteps = [],
  incidentNote = null,
} = {}) {
  const generatedAt = new Date().toISOString();
  const title = 'MediTrust Incident Forensic Report';
  const cleanNote = sanitizeIncidentNote(incidentNote);

  const timeline = chainStages.map((stage) => ({
    order: stage.order,
    label: stage.label,
    title: stage.title,
    shield: stage.shield,
    status: stage.status,
  }));

  const indicators = signals.slice(0, 8).map((s) => ({
    name: s.name,
    severity: s.severity,
  }));

  const actionsRecommended = playbookSteps.map((s) => s.title);

  const reportTo = [
    {
      name: 'National Cyber Crime Reporting Portal',
      url: 'https://cybercrime.gov.in',
    },
    {
      name: 'Cyber Crime Helpline',
      contact: '1930',
    },
  ];

  const evidenceChecklist = [
    'Screenshots of messages',
    'Call time and duration',
    'Transaction IDs if any money moved',
    'Telecom or bank SMS alerts',
  ];

  // Build clean GitHub-flavored Markdown
  const mdLines = [
    `# ${title}`,
    ``,
    `**Generated:** ${generatedAt}  `,
    `**Composite Risk:** ${fusedRisk}/100 [${level.toUpperCase()}]  `,
    `**Classification:** ${threat}  `,
    ``,
    `---`,
    ``,
    `## 1. Attack Chain Reconstruction Timeline`,
    ``,
  ];

  for (const s of chainStages) {
    const statusTag = String(s.status).toUpperCase();
    mdLines.push(`- **Stage 0${s.order} [${s.label} - ${statusTag}]**: ${s.title}`);
  }

  mdLines.push(``, `## 2. Telemetry Threat Indicators`, ``);
  if (indicators.length === 0) {
    mdLines.push(`_No critical threat indicators recorded._`);
  } else {
    for (const ind of indicators) {
      mdLines.push(`- **[${ind.severity.toUpperCase()}]** ${ind.name}`);
    }
  }

  mdLines.push(``, `## 3. Recommended Containment Actions`, ``);
  for (let i = 0; i < actionsRecommended.length; i++) {
    mdLines.push(`${i + 1}. ${actionsRecommended[i]}`);
  }

  if (cleanNote) {
    mdLines.push(
      ``,
      `## 4. User note (unverified)`,
      ``,
      `> ${cleanNote}`,
      ``
    );
  }

  mdLines.push(
    ``,
    `## 5. Official Escalation & Evidence Checklist`,
    ``,
    `**Helplines:**`,
    `- National Cyber Crime Helpline: 1930`,
    `- Official Portal: https://cybercrime.gov.in`,
    ``,
    `**Evidence to Preserve:**`
  );

  for (const item of evidenceChecklist) {
    mdLines.push(`- [ ] ${item}`);
  }

  mdLines.push(
    ``,
    `---`,
    ``,
    `> **Disclaimer:** ${FUSION_CONFIG.DISCLAIMER}`
  );

  const markdown = mdLines.join('\n');

  return {
    title,
    generatedAt,
    fused: {
      risk: fusedRisk,
      level,
      threat,
    },
    timeline,
    indicators,
    actionsRecommended,
    reportTo,
    evidenceChecklist,
    markdown,
    disclaimer: FUSION_CONFIG.DISCLAIMER,
  };
}

export default {
  sanitizeIncidentNote,
  buildIncidentReport,
};
