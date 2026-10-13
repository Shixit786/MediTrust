#!/usr/bin/env node
/**
 * scripts/sim-smoke.mjs
 * End-to-end smoke verification for SIM Guard (Registration, Live WebSockets,
 * Full Chain / Single Vector Simulation, Freeze Protocol, Guardian Alert).
 *
 * Usage:
 *   node scripts/sim-smoke.mjs --phone 9876543210
 *   node scripts/sim-smoke.mjs --phone 9876543210 --type full_chain
 *   node scripts/sim-smoke.mjs --phone 9876543210 --type sim_swap
 */

import { io } from 'socket.io-client';

const TARGET_HOST = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

function parseArgs() {
  const args = process.argv.slice(2);
  let phone = '9876543210';
  let type = 'full_chain';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && args[i + 1]) {
      phone = args[i + 1].replace(/['"]/g, '');
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1].replace(/['"]/g, '');
      i++;
    }
  }

  return { phone, type };
}

function maskPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(-10);
  if (d.length < 10) return '+91 ••••• •••••';
  return `+91 ${d.slice(0, 2)}••• ••${d.slice(-3)}`;
}

async function runSimSmoke() {
  const { phone, type } = parseArgs();
  const masked = maskPhone(phone);

  console.log('================================================================');
  console.log(' SIM GUARD END-TO-END SMOKE TEST');
  console.log(` Target Server:  ${TARGET_HOST}`);
  console.log(` Target MSISDN:  ${masked} (Masked)`);
  console.log(` Scenario Type:  ${type}`);
  console.log('================================================================\n');

  // 1. Register Number
  console.log('--- 1. REGISTERING SUBSCRIBER LINE ---');
  const regRes = await fetch(`${TARGET_HOST}/api/sim/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      guardianName: 'Dr Sharma',
    }),
  });

  if (!regRes.ok) {
    console.error(`Registration failed with HTTP ${regRes.status}:`, await regRes.text());
    process.exit(1);
  }

  const regData = await regRes.json();
  console.log(`Status:        ${regData.status}`);
  console.log(`Masked Phone:  ${regData.phoneMasked}`);
  console.log(`Initial Risk:  ${regData.riskScore}/100 [${regData.level.toUpperCase()}]`);
  console.log(`Guardian:      ${regData.guardian?.name || 'None'}`);
  console.log(`Simulated:     ${regData.simulated}`);
  console.log(`Disclaimer:    ${regData.disclaimer}\n`);

  // 2. Connect Socket.io client and join room
  console.log('--- 2. CONNECTING TO REAL-TIME TELEMETRY STREAM ---');
  const socket = io(TARGET_HOST, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id}`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      reject(err);
    });
  });

  const joinAck = await new Promise((resolve) => {
    socket.emit('join:sim', { phone }, (ack) => resolve(ack));
  });

  if (!joinAck?.ok) {
    console.error('Socket join:sim rejected:', joinAck);
    socket.disconnect();
    process.exit(1);
  }
  console.log(`Joined SIM room successfully (Ack: ok=${joinAck.ok}, phone=${joinAck.phoneMasked})\n`);

  // Track live socket events
  const receivedEvents = [];
  socket.on('sim:event', (payload) => {
    receivedEvents.push(payload);
    console.log(
      `[LIVE TELEMETRY] ${payload.event?.timeFormatted || 'NOW'} | ` +
      `TYPE: ${payload.event?.type} | ` +
      `RISK: ${payload.riskScore}/100 [${payload.level?.toUpperCase()}] | ` +
      `TITLE: ${payload.event?.title}`
    );
  });

  socket.on('sim:freeze', (payload) => {
    console.log(`[LIVE FREEZE EVENT] Frozen=${payload.frozen}`);
  });

  socket.on('sim:guardian', (payload) => {
    console.log(`[LIVE GUARDIAN EVENT] Alerted=${payload.guardian?.name}`);
  });

  // 3. Trigger Simulation
  console.log(`--- 3. DISPATCHING SIMULATION TRIGGER (${type}) ---`);
  const simRes = await fetch(`${TARGET_HOST}/api/sim/simulate/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  if (!simRes.ok) {
    console.error(`Simulation trigger failed with HTTP ${simRes.status}:`, await simRes.text());
    socket.disconnect();
    process.exit(1);
  }

  const simData = await simRes.json();
  console.log(`Immediate Response: Risk ${simData.risk}/100 [${simData.level.toUpperCase()}]`);
  if (simData.scheduled) {
    console.log(`Chain Scheduled: ${simData.scheduled} steps will arrive over the next 6 seconds...`);
    // Wait for the full chain to play out over WebSockets
    await new Promise((r) => setTimeout(r, 7000));
  } else {
    // Wait brief moment for single event socket delivery
    await new Promise((r) => setTimeout(r, 500));
  }

  // 4. Test Freeze Protocol
  console.log('\n--- 4. ENGAGING FREEZE PROTOCOL ---');
  const freezeRes = await fetch(`${TARGET_HOST}/api/sim/freeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const freezeData = await freezeRes.json();
  console.log(`Freeze Status:  ${freezeData.frozen ? 'LOCKED' : 'UNLOCKED'}`);
  console.log('Action Steps:');
  freezeData.steps.forEach((s, idx) => console.log(`  ${idx + 1}. ${s}`));
  console.log(`Advisory:       ${freezeData.note}\n`);

  // 5. Test Guardian Alert
  console.log('--- 5. DISPATCHING SIMULATED GUARDIAN ALERT ---');
  const alertRes = await fetch(`${TARGET_HOST}/api/sim/guardian-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const alertData = await alertRes.json();
  console.log(`Recipient:      ${alertData.to}`);
  console.log(`SMS Preview:    "${alertData.message}"`);
  console.log(`Simulated:      ${alertData.simulated}\n`);

  // 6. Query Final State via GET /api/sim/:phone
  console.log('--- 6. FINAL SHIELD STATUS VERIFICATION ---');
  const stateRes = await fetch(`${TARGET_HOST}/api/sim/${phone}`);
  const finalState = await stateRes.json();

  console.log(`Shield:         ${finalState.shield}`);
  console.log(`Final Risk:     ${finalState.risk}/100 [${finalState.level.toUpperCase()}]`);
  console.log(`Threat Label:   ${finalState.threat}`);
  console.log(`Confidence:     ${finalState.confidence}`);
  console.log(`Total Events:   ${finalState.events?.length || 0}`);
  console.log(`Frozen:         ${finalState.frozen}`);
  console.log(`Signals (${finalState.signals?.length || 0}):`);
  (finalState.signals || []).forEach((s) => {
    console.log(`  * [${s.severity.toUpperCase()}] ${s.name}: ${s.detail}`);
  });
  console.log(`AI Forensics:   ${finalState.ai?.summary_en} (Provider: ${finalState.ai?.provider})`);

  socket.disconnect();

  console.log('\n================================================================');
  console.log(' SIM SMOKE VERIFICATION COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runSimSmoke().catch((err) => {
  console.error('Smoke script fatal error:', err);
  process.exit(1);
});
