import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocket } from '../src/sockets/index.js';
import {
  SimStore,
  maskPhoneNumber,
  hashPhoneNumber,
  simStore,
} from '../src/services/sim/simStore.js';
import {
  evaluateSimRisk,
  createSimEvent,
  determineSimThreatLabel,
  BASE_WEIGHTS,
} from '../src/services/sim/simRules.js';
import { env } from '../src/config/env.js';

describe('SIM Rules & Anomaly Scoring', () => {
  test('Individual event scoring matches catalogue base weights', () => {
    const ev1 = createSimEvent('sim_swap');
    const res1 = evaluateSimRisk([ev1]);
    assert.equal(res1.riskScore, 40);
    assert.equal(res1.level, 'medium');

    const ev2 = createSimEvent('otp_flood');
    const res2 = evaluateSimRisk([ev2]);
    assert.equal(res2.riskScore, 20);
    assert.equal(res2.level, 'low');
  });

  test('Combo bonus: sim_swap + otp_flood grants +15 bonus and spikes risk >= 60', () => {
    const ev1 = createSimEvent('sim_swap');
    const ev2 = createSimEvent('otp_flood');
    const res = evaluateSimRisk([ev1, ev2]);

    // 40 + 20 + 15 = 75
    assert.equal(res.riskScore, 75);
    assert.equal(res.level, 'high');
    assert.equal(res.threat, 'SIM Swap Attack Pattern');
  });

  test('Combo bonus: sim_swap + call_forwarding grants +15 bonus', () => {
    const ev1 = createSimEvent('sim_swap');
    const ev2 = createSimEvent('call_forwarding');
    const res = evaluateSimRisk([ev1, ev2]);

    // 40 + 25 + 15 = 80
    assert.equal(res.riskScore, 80);
    assert.equal(res.level, 'critical');
    assert.equal(res.comboBonus, 15);
  });

  test('Multiple combos cap bonus at max +30 and score clamps at 100', () => {
    const events = [
      createSimEvent('sim_swap'), // 40
      createSimEvent('otp_flood'), // 20
      createSimEvent('call_forwarding'), // 25
      createSimEvent('port_out_request'), // 35
      createSimEvent('new_device_login'), // 15
    ];
    // Base sum = 135. Combos matched: sim_swap+otp_flood (15), sim_swap+call_forwarding (15), port_out+new_device (15) -> 45 capped at 30
    const res = evaluateSimRisk(events);
    assert.equal(res.comboBonus, 30);
    assert.equal(res.riskScore, 100);
    assert.equal(res.level, 'critical');
  });

  test('Time decay: events older than 30 simulated minutes count at 70%', () => {
    const now = Date.now();
    const oldTimestamp = new Date(now - 35 * 60 * 1000).toISOString(); // 35 minutes ago

    const oldEvent = createSimEvent('sim_swap', { timestamp: oldTimestamp });
    const res = evaluateSimRisk([oldEvent], now);

    // 40 * 0.7 = 28
    assert.equal(res.riskScore, 28);
    assert.equal(res.level, 'low');
  });

  test('Threat label thresholds are deterministic', () => {
    assert.equal(determineSimThreatLabel(0), 'No Strong SIM Anomaly');
    assert.equal(determineSimThreatLabel(29), 'No Strong SIM Anomaly');
    assert.equal(determineSimThreatLabel(30), 'Suspicious SIM Activity');
    assert.equal(determineSimThreatLabel(59), 'Suspicious SIM Activity');
    assert.equal(determineSimThreatLabel(60), 'SIM Swap Attack Pattern');
    assert.equal(determineSimThreatLabel(95), 'SIM Swap Attack Pattern');
  });

  test('Signals format: severity ordered and capped at 8', () => {
    const events = [
      createSimEvent('new_device_login'),
      createSimEvent('sim_swap'),
      createSimEvent('otp_flood'),
    ];
    const res = evaluateSimRisk(events);
    assert.ok(res.signals.length <= 8);
    assert.equal(res.signals[0].severity, 'critical'); // sim_swap
  });
});

describe('SimStore In-Memory State & Privacy', () => {
  test('Masking format produces +91 98••• ••210', () => {
    const masked = maskPhoneNumber('9820144210');
    assert.equal(masked, '+91 98••• ••210');

    const maskedWithPrefix = maskPhoneNumber('+91 9820144210');
    assert.equal(maskedWithPrefix, '+91 98••• ••210');
  });

  test('Hash is non-reversible from stored fields', () => {
    const phone = '9820144210';
    const hash = hashPhoneNumber(phone);
    assert.ok(typeof hash === 'string');
    assert.equal(hash.length, 64);
    assert.ok(!hash.includes(phone));
  });

  test('Event cap preserves only the most recent 50 events', () => {
    const customStore = new SimStore({ autoSweep: false });
    const phone = '9820144210';
    customStore.register(phone);

    for (let i = 0; i < 60; i++) {
      customStore.appendEvent(phone, createSimEvent('location_anomaly', { title: `Event ${i}` }));
    }

    const profile = customStore.get(phone);
    assert.equal(profile.events.length, 50);
    assert.equal(profile.events[49].title, 'Event 59');
  });

  test('Eviction at profile limit removes oldest profile', () => {
    const smallStore = new SimStore({ maxProfiles: 3, autoSweep: false });
    smallStore.register('9820144211');
    smallStore.register('9820144212');
    smallStore.register('9820144213');
    assert.equal(smallStore.size(), 3);

    // 4th registration should evict the first
    smallStore.register('9820144214');
    assert.equal(smallStore.size(), 3);
    assert.equal(smallStore.get('9820144211'), null);
    assert.ok(smallStore.get('9820144214') !== null);
  });

  test('TTL sweep expires inactive profiles', () => {
    const shortTtlStore = new SimStore({ ttlMs: 50, autoSweep: false });
    shortTtlStore.register('9820144210');
    assert.ok(shortTtlStore.get('9820144210') !== null);

    // Sleep 60ms to exceed TTL
    const start = Date.now();
    while (Date.now() - start < 60) {
      // busy wait
    }

    const swept = shortTtlStore.sweep();
    assert.equal(swept, 1);
    assert.equal(shortTtlStore.get('9820144210'), null);
  });
});

describe('SIM Guard API Routes & Integration', () => {
  let server;
  let baseUrl;
  let socketServer;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    socketServer = initSocket(server);
    app.set('io', socketServer);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    simStore.clearAll();
    if (socketServer) {
      await new Promise((resolve) => socketServer.close(resolve));
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/sim/register creates profile with masked number and low risk', async () => {
    const res = await fetch(`${baseUrl}/api/sim/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210', guardianName: 'Dr Sharma' }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.phoneMasked, '+91 98••• ••210');
    assert.equal(data.status, 'MONITORING');
    assert.equal(data.riskScore, 0);
    assert.equal(data.simulated, true);
    assert.ok(data.disclaimer.includes('Simulated demo'));
    assert.equal(data.guardian.name, 'Dr Sharma');
  });

  test('POST /api/sim/register rejects invalid phone with 400', async () => {
    const res = await fetch(`${baseUrl}/api/sim/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '12345' }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'VALIDATION_ERROR');
  });

  test('GET /api/sim/:phone returns current state or 404 if unregistered', async () => {
    const okRes = await fetch(`${baseUrl}/api/sim/9820144210`);
    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.shield, 'sim');
    assert.equal(okData.phoneMasked, '+91 98••• ••210');
    assert.equal(okData.simulated, true);

    const notFoundRes = await fetch(`${baseUrl}/api/sim/9876543219`);
    assert.equal(notFoundRes.status, 404);
  });

  test('POST /api/sim/simulate/:type executes event and raises risk score', async () => {
    // 1. Trigger sim_swap
    const res1 = await fetch(`${baseUrl}/api/sim/simulate/sim_swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.risk, 40);

    // 2. Trigger otp_flood -> triggers combo bonus -> risk >= 60
    const res2 = await fetch(`${baseUrl}/api/sim/simulate/otp_flood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.ok(data2.risk >= 60, `Expected risk >= 60, got ${data2.risk}`);
    assert.ok(data2.level === 'high' || data2.level === 'critical');
    assert.equal(data2.simulated, true);
    assert.ok(data2.lastEvent !== undefined);
  });

  test('POST /api/sim/simulate/invalid_type returns 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/sim/simulate/fake_event_type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res.status, 400);
  });

  test('POST /api/sim/freeze is idempotent and locks line', async () => {
    const res1 = await fetch(`${baseUrl}/api/sim/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.frozen, true);
    assert.equal(data1.simulated, true);
    assert.ok(Array.isArray(data1.steps));

    // Call again to verify idempotency
    const res2 = await fetch(`${baseUrl}/api/sim/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res2.status, 200);
  });

  test('POST /api/sim/guardian-alert sends alert or returns 409 if no guardian', async () => {
    // 1. For profile with guardian
    const resWith = await fetch(`${baseUrl}/api/sim/guardian-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(resWith.status, 200);
    const dataWith = await resWith.json();
    assert.equal(dataWith.to, 'Dr Sharma');
    assert.equal(dataWith.simulated, true);
    assert.ok(dataWith.message.includes('+91 98••• ••210'));

    // 2. Register a second number with NO guardian
    await fetch(`${baseUrl}/api/sim/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144211' }),
    });

    const resWithout = await fetch(`${baseUrl}/api/sim/guardian-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144211' }),
    });
    assert.equal(resWithout.status, 409);
  });

  test('POST /api/sim/reset clears profile', async () => {
    const res = await fetch(`${baseUrl}/api/sim/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144210' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reset, true);

    const getRes = await fetch(`${baseUrl}/api/sim/9820144210`);
    const getData = await getRes.json();
    assert.equal(getData.risk, 0);
    assert.equal(getData.level, 'low');
    assert.equal(getData.frozen, false);
  });

  test('POST /api/sim/reset without phone is forbidden in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await fetch(`${baseUrl}/api/sim/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    process.env.NODE_ENV = prevEnv;
    assert.equal(res.status, 403);
  });
});

describe('Socket.io Real-time Telemetry & Privacy', () => {
  let server;
  let baseUrl;
  let socketServer;
  let clientSocket;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    socketServer = initSocket(server);
    app.set('io', socketServer);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Register phone for socket test
    simStore.register('9820144222');
  });

  after(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    simStore.clearAll();
    if (socketServer) {
      await new Promise((resolve) => socketServer.close(resolve));
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('join:sim requires valid registered number', async () => {
    clientSocket = ioClient(baseUrl, { reconnection: false });
    await new Promise((resolve) => clientSocket.on('connect', resolve));

    // Try unregistered number
    const unregAck = await new Promise((resolve) => {
      clientSocket.emit('join:sim', { phone: '9876543219' }, resolve);
    });
    assert.equal(unregAck.ok, false);
    assert.equal(unregAck.code, 'NOT_REGISTERED');

    // Try registered number
    const regAck = await new Promise((resolve) => {
      clientSocket.emit('join:sim', { phone: '9820144222' }, resolve);
    });
    assert.equal(regAck.ok, true);
    assert.equal(regAck.phoneMasked, '+91 98••• ••222');
  });

  test('Client receives sim:event with simulated:true and NO full phone number', async () => {
    const eventPromise = new Promise((resolve) => {
      clientSocket.on('sim:event', (payload) => {
        resolve(payload);
      });
    });

    // Trigger simulation via REST
    await fetch(`${baseUrl}/api/sim/simulate/location_anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820144222' }),
    });

    const receivedEvent = await eventPromise;
    assert.ok(receivedEvent !== null);
    assert.equal(receivedEvent.simulated, true);
    assert.equal(receivedEvent.event.type, 'location_anomaly');

    // Check payload serialization contains NO raw 10-digit number
    const serialized = JSON.stringify(receivedEvent);
    assert.ok(!serialized.includes('9820144222'));
  });
});
