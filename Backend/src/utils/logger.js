import { env } from '../config/env.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Collect all secret values from process.env to redact automatically
function getSecretValues() {
  const secrets = [];
  const secretPattern = /(?:_KEY|_URI|_TOKEN|_SECRET)$/i;

  for (const [key, val] of Object.entries(process.env)) {
    if (secretPattern.test(key) && val && typeof val === 'string' && val.trim().length >= 4) {
      secrets.push(val.trim());
    }
  }

  // Sort by length descending so longer secrets are matched first
  return secrets.sort((a, b) => b.length - a.length);
}

function sanitize(message) {
  if (message === null || message === undefined) return '';

  let str =
    message instanceof Error
      ? message.stack || message.message
      : typeof message === 'object'
      ? JSON.stringify(message)
      : String(message);

  // Redact secrets
  const secrets = getSecretValues();
  for (const secret of secrets) {
    str = str.split(secret).join('[REDACTED]');
  }

  // Mask any run of 8 or more consecutive digits (e.g. Indian phone numbers, OTPs, IDs)
  str = str.replace(/\d{8,}/g, '[MASKED_DIGITS]');

  return str;
}

function shouldLog(level) {
  const currentThreshold = LOG_LEVELS[env?.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;
  const levelPriority = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  return levelPriority <= currentThreshold;
}

function writeLog(level, message, ...args) {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  let fullMessage = sanitize(message);

  if (args.length > 0) {
    const additional = args.map((arg) => sanitize(arg)).join(' ');
    fullMessage = `${fullMessage} ${additional}`;
  }

  const line = `[${timestamp}] [${level.toUpperCase()}] ${fullMessage}\n`;

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export const logger = {
  error: (msg, ...args) => writeLog('error', msg, ...args),
  warn: (msg, ...args) => writeLog('warn', msg, ...args),
  info: (msg, ...args) => writeLog('info', msg, ...args),
  debug: (msg, ...args) => writeLog('debug', msg, ...args),
};

export default logger;
