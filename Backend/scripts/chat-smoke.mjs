#!/usr/bin/env node
/**
 * Smoke test script for MediTrust Assistant Chatbot.
 * Usage: node scripts/chat-smoke.mjs "<message>"
 */

import { processChat } from '../src/services/chat.service.js';

const message = process.argv[2] || 'I shared an OTP with someone calling from my bank';

console.log(`\n=== MediTrust Chat Smoke Test ===`);
console.log(`Input: "${message}"\n`);

try {
  const result = await processChat({
    messages: [{ role: 'user', content: message }],
    context: { page: '/dashboard' },
  });

  console.log(`Status:  SUCCESS (200 OK)`);
  console.log(`Source:  ${result.source}`);
  console.log(`Reply:   ${result.reply}`);
  console.log(`Actions: ${JSON.stringify(result.actions, null, 2)}`);
  if (result.suggestions) {
    console.log(`Suggestions: ${JSON.stringify(result.suggestions)}`);
  }
  console.log(`\n=================================\n`);
} catch (err) {
  console.error(`Status: FAILED - ${err.message}`);
  process.exit(1);
}
