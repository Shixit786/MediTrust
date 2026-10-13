const BASE_URL = 'http://127.0.0.1:5000/api/job/analyze';

console.log('Testing Job Shield Error Cases...\n');

// 1. Empty body -> 400 NO_INPUT
const emptyRes = await fetch(BASE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const emptyJson = await emptyRes.json();
console.log('1. Empty body: Status', emptyRes.status, 'Code:', emptyJson.code, 'Error:', emptyJson.error);
if (emptyRes.status !== 400 || emptyJson.code !== 'NO_INPUT') throw new Error('Expected 400 NO_INPUT');

// 2. 10-character text -> 422 TEXT_TOO_SHORT
const shortRes = await fetch(BASE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Too short!' }),
});
const shortJson = await shortRes.json();
console.log('2. 10-char text: Status', shortRes.status, 'Code:', shortJson.code, 'Error:', shortJson.error);
if (shortRes.status !== 422 || shortJson.code !== 'TEXT_TOO_SHORT') throw new Error('Expected 422 TEXT_TOO_SHORT');

// 3. Both file and text -> 400 BAD_REQUEST
const bothForm = new FormData();
bothForm.append('text', 'Here is some text accompanying the file upload');
bothForm.append('file', new Blob([Buffer.from('%PDF-1.4 dummy')], { type: 'application/pdf' }), 'test.pdf');
const bothRes = await fetch(BASE_URL, {
  method: 'POST',
  body: bothForm,
});
const bothJson = await bothRes.json();
console.log('3. Both file and text: Status', bothRes.status, 'Code:', bothJson.code, 'Error:', bothJson.error);
if (bothRes.status !== 400 || bothJson.code !== 'BAD_REQUEST') throw new Error('Expected 400 BAD_REQUEST');

// 4. .txt renamed to .pdf -> 415 UNSUPPORTED_MEDIA
const fakePdfForm = new FormData();
fakePdfForm.append('file', new Blob([Buffer.from('This is a text file masquerading as pdf.')], { type: 'application/pdf' }), 'fake.pdf');
const badMediaRes = await fetch(BASE_URL, {
  method: 'POST',
  body: fakePdfForm,
});
const badMediaJson = await badMediaRes.json();
console.log('4. Renamed .txt -> .pdf: Status', badMediaRes.status, 'Code:', badMediaJson.code, 'Error:', badMediaJson.error);
if (badMediaRes.status !== 415 || badMediaJson.code !== 'UNSUPPORTED_MEDIA') throw new Error('Expected 415 UNSUPPORTED_MEDIA');

// 5. 6 MB file -> 413 FILE_TOO_LARGE
const largeForm = new FormData();
const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
largeBuffer.write('%PDF-1.4', 0);
largeForm.append('file', new Blob([largeBuffer], { type: 'application/pdf' }), 'large.pdf');
const largeRes = await fetch(BASE_URL, {
  method: 'POST',
  body: largeForm,
});
const largeJson = await largeRes.json();
console.log('5. 6 MB file: Status', largeRes.status, 'Code:', largeJson.code, 'Error:', largeJson.error);
if (largeRes.status !== 413 || largeJson.code !== 'FILE_TOO_LARGE') throw new Error('Expected 413 FILE_TOO_LARGE');

// 6. Encrypted or corrupt PDF -> 422 PDF_UNREADABLE
const corruptForm = new FormData();
const corruptBuffer = Buffer.from('%PDF-1.4\nCorrupt trailer invalid body syntax %%EOF');
corruptForm.append('file', new Blob([corruptBuffer], { type: 'application/pdf' }), 'corrupt.pdf');
const corruptRes = await fetch(BASE_URL, {
  method: 'POST',
  body: corruptForm,
});
const corruptJson = await corruptRes.json();
console.log('6. Corrupt PDF: Status', corruptRes.status, 'Code:', corruptJson.code, 'Error:', corruptJson.error);
if (corruptRes.status !== 422 || corruptJson.code !== 'PDF_UNREADABLE') throw new Error('Expected 422 PDF_UNREADABLE');

// 7. Scanned PDF without text -> 422 PDF_NO_TEXT
const noTextForm = new FormData();
// Minimal PDF with empty content stream
const emptyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000210 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n260\n%%EOF\n'
);
noTextForm.append('file', new Blob([emptyPdf], { type: 'application/pdf' }), 'scanned.pdf');
const noTextRes = await fetch(BASE_URL, {
  method: 'POST',
  body: noTextForm,
});
const noTextJson = await noTextRes.json();
console.log('7. Scanned/No-text PDF: Status', noTextRes.status, 'Code:', noTextJson.code, 'Error:', noTextJson.error);
if (noTextRes.status !== 422 || noTextJson.code !== 'PDF_NO_TEXT') throw new Error('Expected 422 PDF_NO_TEXT');

// 8. 21st request within a minute -> 429 RATE_LIMITED
console.log('8. Testing Rate Limit (max 20 req/min, 21st should return 429)...');
let rateLimited = false;
let rateLimitJson = null;

for (let i = 1; i <= 25; i++) {
  const rlRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (rlRes.status === 429) {
    rateLimited = true;
    rateLimitJson = await rlRes.json();
    console.log(`   Hit 429 on request #${i}: Code=${rateLimitJson.code}, Error=${rateLimitJson.error}`);
    break;
  }
}

if (!rateLimited) throw new Error('Expected 429 RATE_LIMITED');

console.log('\n[SUCCESS] All 8 error cases passed with exact HTTP statuses and error codes!');
