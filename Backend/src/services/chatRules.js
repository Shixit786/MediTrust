/**
 * Layer 1 Deterministic Intent Router and Vetted Safety Guidance
 * Matches intents using English, Roman Hinglish, and Devanagari keywords.
 * Always produces calm, concise, English-only replies with allow-listed actions.
 */

// Allow-listed destination routes for action buttons
const ALLOWED_ROUTES = new Set([
  '/job',
  '/voice',
  '/sim',
  '/fusion',
  '/playbook',
  '/dashboard',
  '/history',
]);

export function validateActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((a) => a && typeof a.label === 'string' && ALLOWED_ROUTES.has(a.to))
    .slice(0, 3);
}

/**
 * Normalizes text for matching:
 * Converts to lowercase, strips punctuation and diacritics, collapses spaces.
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if normalized string contains any of the keywords/phrases
 */
function containsAny(normalized, patterns) {
  return patterns.some((p) => {
    const cleanPattern = normalizeText(p);
    if (!cleanPattern) return false;
    // For non-latin scripts (like Devanagari), check direct substring
    if (/[\u0900-\u097F]/.test(cleanPattern)) {
      return normalized.includes(cleanPattern);
    }
    const parts = cleanPattern.split(' ').filter(Boolean);
    if (parts.length === 1) {
      const regex = new RegExp(`\\b${parts[0]}\\b`, 'u');
      return regex.test(normalized);
    }
    // Direct substring match
    if (normalized.includes(cleanPattern)) {
      return true;
    }
    // Allow up to 2 intervening filler words (e.g. "shared an otp", "job offer is real")
    const regexStr = parts.map((part) => `\\b${part}\\b`).join('(?:\\s+\\w+){0,2}\\s+');
    try {
      const rx = new RegExp(regexStr, 'u');
      return rx.test(normalized);
    } catch {
      return false;
    }
  });
}

export const RULES = [
  // 1. SHARED OTP
  {
    intent: 'shared_otp',
    keywords: [
      'shared otp',
      'shared an otp',
      'shared my otp',
      'gave otp',
      'gave an otp',
      'told otp',
      'told an otp',
      'sent otp',
      'sent an otp',
      'entered otp',
      'typed otp',
      'provided otp',
      'otp de diya',
      'otp share kar diya',
      'otp diya',
      'otp bata diya',
      'otp bhej diya',
      'ओटीपी दे दिया',
      'ओटीपी बता दिया',
      'ओटीपी शेयर',
      'shared my otp',
      'gave my otp',
    ],
    reply:
      'If you shared an OTP with an unknown party, act immediately:\n1) Call your bank on its official number right now and request a block on cards, UPI, and net banking.\n2) Dial 1930 (National Cyber Crime Helpline) without delay.\n3) File a formal complaint at cybercrime.gov.in.\n4) Change your online banking and email passwords from a clean device, preserve transaction screenshots, and inform a family member.',
    actions: [
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
      { label: 'CHECK SIM GUARD ↗', to: '/sim' },
    ],
    suggestions: [
      'What if money was already debited?',
      'How to report on cybercrime.gov.in?',
      'Should I block my SIM too?',
    ],
  },

  // 2. SENT MONEY
  {
    intent: 'sent_money',
    keywords: [
      'sent money',
      'transferred money',
      'paid money',
      'paid scammer',
      'money deducted',
      'paise bhej diye',
      'paise transfer kar diye',
      'payment kar diya',
      'paise chale gaye',
      'paise kat gaye',
      'पैसे भेज दिए',
      'पैसे ट्रांसफर',
      'पैसे कट गए',
      'scammer took money',
      'lost money to scam',
    ],
    reply:
      'If you transferred funds to a fraudulent party, take these urgent steps:\n1) Call your bank immediately and ask to freeze the transaction or dispute the transfer.\n2) Call 1930 (Cyber Crime Helpline) within the golden hour to increase recovery chances.\n3) Register the incident at cybercrime.gov.in with transaction reference numbers (UTR/UPI IDs).\n4) Save transaction receipts and conversation screenshots for documentation.',
    actions: [
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
      { label: 'VIEW AUDIT HISTORY ↗', to: '/history' },
    ],
    suggestions: [
      'How does helpline 1930 work?',
      'Can bank reverse the UPI transfer?',
      'What documents do I need to file?',
    ],
  },

  // 3. SIM STOPPED / NETWORK LOSS
  {
    intent: 'sim_stopped',
    keywords: [
      'sim stopped',
      'sim not working',
      'network gone',
      'no signal',
      'sim band ho gaya',
      'network chala gaya',
      'sim deactivate',
      'sim blocked',
      'सिम बंद',
      'नेटवर्क चला गया',
      'सिम काम नहीं कर रहा',
      'sudden loss of signal',
      'sim swap',
    ],
    reply:
      'Sudden prolonged signal loss may indicate an unauthorized SIM swap:\n1) Use another telephone to call your telecom carrier customer service immediately and verify SIM status.\n2) Contact your primary bank to temporarily suspend mobile banking and net banking access.\n3) Never ignore unexpected cellular inactivity, as attackers hijack SIMs to intercept banking OTPs.\n4) If an unauthorized swap occurred, lodge a report at 1930 and cybercrime.gov.in.',
    actions: [
      { label: 'OPEN SIM GUARD ↗', to: '/sim' },
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'What is a SIM swap attack?',
      'How do attackers steal SIM cards?',
      'How to protect my bank account?',
    ],
  },

  // 4. REMOTE ACCESS APP
  {
    intent: 'remote_access_app',
    keywords: [
      'anydesk',
      'teamviewer',
      'quicksupport',
      'rustdesk',
      'ultraviewer',
      'remote access',
      'screen share app',
      'anydesk download',
      'app download karwaya',
      'screen share karwaya',
      'एनीडेस्क',
      'टीमव्यूअर',
      'रिमोट एक्सेस',
    ],
    reply:
      'If you installed a screen sharing or remote desktop application:\n1) Disconnect your phone from the internet (turn off Wi-Fi and mobile data) immediately.\n2) Uninstall the application (AnyDesk, TeamViewer, QuickSupport) completely from your device.\n3) From another secure device, change your banking, UPI, and email passwords immediately.\n4) Review recent account activity and call your bank if you observe unauthorized access.',
    actions: [
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
      { label: 'VIEW DASHBOARD ↗', to: '/dashboard' },
    ],
    suggestions: [
      'Can they still access my phone after uninstalling?',
      'Should I factory reset my phone?',
      'What if they opened my banking app?',
    ],
  },

  // 5. THREAT CALL / DIGITAL ARREST
  {
    intent: 'threat_call',
    keywords: [
      'digital arrest',
      'cbi call',
      'police arrest',
      'customs parcel',
      'arrest warrant',
      'fedex parcel',
      'police calling',
      'threat call',
      'police bol rahe hain',
      'arrest kar lenge',
      'cbi bol rahe hain',
      'डिजिटल अरेस्ट',
      'पुलिस कॉल',
      'सीबीआई',
      'वारंट',
    ],
    reply:
      'This follows the classic "digital arrest" fraud pattern. Stay calm:\n1) No legitimate law enforcement agency, CBI, customs, or court conducts arrests over Skype, WhatsApp, or video calls.\n2) Hang up the call immediately. Legitimate agencies never demand money to "clear" an investigation.\n3) Never transfer funds into any "safe verification account" or "court escrow".\n4) Block the number and report the intimidation attempt to 1930 and cybercrime.gov.in.',
    actions: [
      { label: 'VERIFY VOICE ↗', to: '/voice' },
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'Why do they have my Aadhaar details?',
      'Can police arrest over video call?',
      'What if they sent a court letter PDF?',
    ],
  },

  // 6. JOB FEE SCAM
  {
    intent: 'job_fee',
    keywords: [
      'registration fee',
      'security deposit',
      'laptop courier fee',
      'job fee',
      'training fee',
      'form fee',
      'interview fee',
      'processing charge',
      'naukri ke paise',
      'form ke paise',
      'नौकरी के लिए पैसे',
      'रजिस्ट्रेशन फीस',
      'फीस मांग रहे हैं',
      'deposit for job',
      'is this job offer real',
      'job offer real',
      'fake job offer',
    ],
    reply:
      'Demanding upfront fees is a primary indicator of recruitment fraud:\n1) Stop all communication immediately. Legitimate companies never charge registration fees, interview deposits, or equipment courier charges.\n2) Do not send money or banking credentials.\n3) Scan the offer letter or job message in MediTrust Job Shield to inspect phishing links and domain anomalies.\n4) If you already sent funds, report the transaction to 1930 and cybercrime.gov.in.',
    actions: [
      { label: 'SCAN JOB OFFER ↗', to: '/job' },
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'How to verify if a company is real?',
      'Why do fake jobs ask for registration fees?',
      'Scan my offer letter now',
    ],
  },

  // 7. FAMILY EMERGENCY CLAIM
  {
    intent: 'family_emergency_claim',
    keywords: [
      'mama bimar',
      'relative hospital',
      'relative in hospital',
      'hospital emergency',
      'hospital emergency call',
      'accident money',
      'surgery money',
      'bimar hai paise',
      'relative in trouble',
      'doctor calling',
      'doctor calling for money',
      'family emergency',
      'relative is sick and needs money',
      'relative sick and needs money',
      'someone says my relative is sick',
      'relative sick',
      'रिश्तेदार बीमार',
      'अस्पताल पैसे',
      'एक्सीडेंट',
      'इलाज के लिए पैसे',
      'urgent medical emergency',
    ],
    reply:
      'Emergency medical claims are frequently fabricated to provoke panic:\n1) Do not send money or enter UPI PINs.\n2) Call your relative directly on their known phone number (not the incoming number or a number provided by the caller).\n3) Contact other family members to cross-verify the situation.\n4) If calling a hospital, verify via their official landline listed on their verified website. For physical life emergencies, dial 112.',
    actions: [
      { label: 'VERIFY VOICE ↗', to: '/voice' },
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'Could they be using an AI cloned voice?',
      'How to cross-verify hospital billing?',
      'What if they sound exactly like my relative?',
    ],
  },

  // 8. CLICKED SUSPICIOUS LINK
  {
    intent: 'clicked_link',
    keywords: [
      'clicked link',
      'clicked a link',
      'clicked suspicious link',
      'clicked a suspicious link',
      'suspicious link',
      'opened link',
      'opened a link',
      'link open kar diya',
      'link par click',
      'downloaded apk',
      'apk install',
      'लिंक क्लिक',
      'एपीके डाउनलोड',
      'opened sms link',
      'clicked whatsapp link',
    ],
    reply:
      'If you tapped a suspicious URL or downloaded an unknown file:\n1) Disconnect your device from mobile data and Wi-Fi immediately.\n2) Delete any downloaded .apk or executable files from your downloads folder.\n3) Never enter passwords, PINs, or card details on the opened web page.\n4) If credentials were submitted, change your passwords from a separate device and notify your bank.',
    actions: [
      { label: 'SCAN JOB OFFER ↗', to: '/job' },
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'How to scan URLs with Job Shield?',
      'Can a link hack my bank without OTP?',
      'Should I reset my phone?',
    ],
  },

  // 9. SHARED DOCUMENTS
  {
    intent: 'shared_documents',
    keywords: [
      'shared aadhaar',
      'shared my aadhaar',
      'shared pan',
      'shared my pan',
      'aadhaar card',
      'pan card',
      'aadhaar de diya',
      'pan card de diya',
      'shared bank details',
      'आधार कार्ड',
      'पैन कार्ड',
      'दस्तावेज दे दिए',
      'shared id proof',
      'sent aadhaar card',
    ],
    reply:
      'If you shared identity documents like Aadhaar or PAN with an untrusted party:\n1) Never share OTPs generated during Aadhaar authentication or bank login.\n2) Consider locking your Aadhaar biometrics using the official UIDAI portal or the mAadhaar app.\n3) Monitor your bank accounts and credit report for unauthorized inquiries.\n4) If you suspect identity theft or loan fraud, report to cybercrime.gov.in and dial 1930.',
    actions: [
      { label: 'OPEN PLAYBOOK ↗', to: '/playbook' },
      { label: 'CHECK SIM GUARD ↗', to: '/sim' },
    ],
    suggestions: [
      'How to lock Aadhaar biometrics?',
      'Can someone take a loan with my PAN?',
      'How to check unauthorized SIMs in my name?',
    ],
  },

  // 10. EXPLAIN RESULT
  {
    intent: 'explain_result',
    keywords: [
      'explain result',
      'what does this score mean',
      'what does this risk score mean',
      'what does risk score mean',
      'risk score mean',
      'score mean',
      'result samjhao',
      'score ka matlab',
      'explain my latest result',
      'explain my score',
      'explain score',
      'what is risk score',
      'why is my score high',
      'स्कोर का मतलब',
      'रिजल्ट समझाओ',
    ],
    reply:
      'MediTrust scores are heuristic risk indicators:\n1) Risk scores (0-100) measure the probability of observed synthetic or deceptive patterns.\n2) Scores provide early warning indicators, not conclusive legal or forensic proof.\n3) Review the individual vector breakdown in each shield to understand contributing flags.\n4) Use the Fusion Engine to cross-reference multiple vectors (Voice, Job, SIM) for correlated attack patterns.',
    actions: [
      { label: 'OPEN FUSION ENGINE ↗', to: '/fusion' },
      { label: 'VIEW PLAYBOOK ↗', to: '/playbook' },
      { label: 'VIEW DASHBOARD ↗', to: '/dashboard' },
    ],
    suggestions: [
      'What does a low score mean?',
      'How does Fusion Engine combine scores?',
      'What should I do if risk is critical?',
    ],
  },

  // 11. HOW IT WORKS
  {
    intent: 'how_it_works',
    keywords: [
      'how it works',
      'how does it work',
      'what is meditrust',
      'how does meditrust work',
      'meditrust work',
      'kaise kaam karta hai',
      'shields kaise chalaye',
      'how does this app work',
      'how to use',
      'app kaise use kare',
      'यह कैसे काम करता है',
      'मेडीट्रस्ट क्या है',
    ],
    reply:
      'MediTrust evaluates multi-channel digital risks across three shields:\n1) Voice Shield: Analyzes speech recordings for acoustic cues of synthetic generative voice clones.\n2) Job Shield: Checks recruitment messages, offer letters, and URLs for upfront fee fraud and phishing.\n3) SIM Guard: Simulates telecom telemetry to evaluate SIM swap vulnerabilities.\nFusion Engine synthesizes all active shields into a unified attack reconstruction.',
    actions: [
      { label: 'SCAN JOB OFFER ↗', to: '/job' },
      { label: 'VERIFY VOICE ↗', to: '/voice' },
      { label: 'VIEW FUSION ENGINE ↗', to: '/fusion' },
    ],
    suggestions: [
      'How does Presenter mode work?',
      'Is my personal data saved anywhere?',
      'What is the National Cyber Crime Helpline?',
    ],
  },

  // 12. GREETING
  {
    intent: 'greeting',
    keywords: [
      'hi',
      'hello',
      'hey',
      'namaste',
      'good morning',
      'good afternoon',
      'good evening',
      'नमस्ते',
      'हेलो',
      'हाय',
      'sup',
    ],
    reply:
      'Hello. I am the MediTrust safety guide. I can help you evaluate suspicious messages, phone calls, or job offers, explain scan results, and guide response steps if you suspect fraud. How can I assist you today?',
    actions: [
      { label: 'SCAN JOB OFFER ↗', to: '/job' },
      { label: 'VERIFY VOICE ↗', to: '/voice' },
      { label: 'VIEW DASHBOARD ↗', to: '/dashboard' },
    ],
    suggestions: [
      'I shared an OTP, what now?',
      'Is this job offer real?',
      'How does MediTrust work?',
    ],
  },

  // 13. THANKS
  {
    intent: 'thanks',
    keywords: [
      'thanks',
      'thank you',
      'thank u',
      'dhanyawad',
      'shukriya',
      'धन्यवाद',
      'शुक्रिया',
      'thx',
      'helpful',
    ],
    reply:
      'You are welcome. Stay safe, remember never to disclose OTPs or passwords over the phone, and feel free to return whenever you encounter unexpected calls or offers.',
    actions: [
      { label: 'VIEW DASHBOARD ↗', to: '/dashboard' },
      { label: 'VIEW PLAYBOOK ↗', to: '/playbook' },
    ],
    suggestions: [
      'Explain how Fusion Engine works',
      'How to report cyber fraud in India?',
    ],
  },

  // 14. OUT OF SCOPE (Medical, legal, investment, chit-chat)
  {
    intent: 'out_of_scope',
    keywords: [
      'what medicine',
      'fever medicine',
      'headache cure',
      'medical advice',
      'treatment for',
      'legal case',
      'will i go to jail',
      'lawyer advice',
      'can i sue',
      'court case',
      'which crypto',
      'best stock to buy',
      'investment tips',
      'who is prime minister',
      'tell me a joke',
      'write a poem',
      'दवा बताओ',
      'शेयर मार्केट',
      'कानूनी सलाह',
    ],
    reply:
      'I can only provide guidance regarding cybersecurity risks, fraud awareness, and MediTrust shields. I do not provide medical diagnoses, legal counsel, or financial investment advice.\n- For medical symptoms, please consult a qualified healthcare professional.\n- For legal matters, speak with a licensed advocate.\n- For cybercrime incidents, dial 1930 or visit cybercrime.gov.in.',
    actions: [
      { label: 'VIEW PLAYBOOK ↗', to: '/playbook' },
      { label: 'VIEW DASHBOARD ↗', to: '/dashboard' },
    ],
    suggestions: [
      'What does MediTrust help with?',
      'How do I check a suspicious job offer?',
      'What should I do if I shared an OTP?',
    ],
  },
];

/**
 * Matches user message against Layer 1 deterministic rules.
 * Returns { intent, reply, actions, suggestions } or null if no rule matched.
 */
export function matchRule(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null;

  const normalized = normalizeText(userMessage);
  if (!normalized) return null;

  for (const rule of RULES) {
    if (containsAny(normalized, rule.keywords)) {
      return {
        intent: rule.intent,
        reply: rule.reply,
        actions: validateActions(rule.actions),
        suggestions: (rule.suggestions || []).slice(0, 3),
      };
    }
  }

  return null;
}
