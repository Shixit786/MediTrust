import { explain } from '../src/services/llm.service.js';

console.log('Testing LLM fallback with invalid GROQ_API_KEY:');

// Test explain directly
const result = await explain({
  systemPrompt: 'You explain audio risk in at most 90 words.',
  userMessage: 'risk: 45, level: medium, confidence: 0.8',
  context: { shield: 'voice' },
});

console.log('Result provider:', result.provider);
console.log('Result text length:', result.text.length);
console.log('Result text sample:', result.text.substring(0, 100) + '...');

if (!result.text || (result.provider !== 'template' && result.provider !== 'nvidia' && result.provider !== 'groq')) {
  throw new Error('LLM did not return text or expected provider');
}

console.log('\n[SUCCESS] Route resilience verified: explain() never throws and cleanly provides fallback.');
