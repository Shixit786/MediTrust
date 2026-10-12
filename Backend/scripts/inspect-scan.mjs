import { connectDB, disconnectDB } from '../src/db/connect.js';
import { Scan } from '../src/models/Scan.js';

await connectDB();

const latestScan = await Scan.findOne({ shield: 'voice' }).sort({ createdAt: -1 }).lean();

console.log('Latest Voice Scan Document from MongoDB:');
console.log(JSON.stringify(latestScan, null, 2));

// Verify strictly privacy-first
console.log('\nPrivacy & Schema Audit:');
console.log('- Has audio data?', ('audio' in latestScan));
console.log('- Has filename?', ('filename' in latestScan || 'fileName' in latestScan || 'name' in latestScan));
console.log('- Has features array?', ('features' in latestScan));
console.log('- Has peaks array?', ('peaks' in latestScan));
console.log('- Has anomalies array?', ('anomalies' in latestScan));
console.log('- Stored signals count:', latestScan.signals?.length);
console.log('- Stored summary max 300 chars:', latestScan.summary?.length <= 300);

await disconnectDB();
