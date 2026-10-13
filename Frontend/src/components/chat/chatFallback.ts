import type { ChatActionItem } from '../../lib/api/chat';

export const GREETING_TEXT =
  'Hi, I am the MediTrust guide. I can help you decide what to do after a suspicious call, message or job offer, explain your scan results, and show you how the shields work. Never type OTPs, PINs or card numbers here.';

export const INITIAL_SUGGESTIONS = [
  'I shared an OTP, what now?',
  'Is this job offer real?',
  'Someone says my relative is sick and needs money',
  'How does MediTrust work?',
];

export const OFFLINE_FALLBACK_TEXT =
  'I cannot reach the assistant right now. If you shared an OTP or sent money: 1) call your bank on its official number and ask to block cards and UPI, 2) call 1930, 3) report at cybercrime.gov.in. If someone claims a relative is in trouble, call that relative directly before paying anything.';

export const OFFLINE_ACTIONS: ChatActionItem[] = [
  { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
  { label: 'SCAN JOB OFFER ↗', to: '/job' },
];

export const FOOTER_DISCLAIMER =
  'SAFETY GUIDANCE · EARLY WARNING, NOT PROOF · NOT LEGAL OR FINANCIAL ADVICE';
