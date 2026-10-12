import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  PORT: '5001',
  MONGODB_URI: 'mongodb://127.0.0.1:27099/meditrust_fake',
};

console.log('Spawning server on port 5001 with unreachable MONGODB_URI...');
const proc = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

proc.stdout.on('data', (d) => process.stdout.write(d.toString()));
proc.stderr.on('data', (d) => process.stderr.write(d.toString()));

// Wait 7 seconds for the 5s connection timeout to fail and server to start listening
setTimeout(async () => {
  try {
    console.log('\nQuerying GET http://localhost:5001/api/health...');
    const res = await fetch('http://localhost:5001/api/health');
    const data = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log('Health Output:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  } finally {
    proc.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  }
}, 7000);
