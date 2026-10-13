import fs from 'node:fs';
import path from 'node:path';

// Construct a valid minimal PDF (version 1.4) with text and link annotation
function createSamplePdf() {
  const textLine1 = 'URGENT APPOINTMENT: Apollo Hospital New Delhi hiring Ward Assistants.';
  const textLine2 = 'Registration fee of Rs 2500 required via UPI before joining.';
  const textLine3 = 'Visit http://apollo-hospitals-recruit.xyz/verify to confirm.';

  const streamContent = `BT
/F1 14 Tf
50 720 Td
(${textLine1}) Tj
0 -25 Td
(${textLine2}) Tj
0 -25 Td
(${textLine3}) Tj
ET`;

  const streamLength = Buffer.byteLength(streamContent);

  const objects = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    // 3: Page with Font resource and Link annotation
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R /Annots [6 0 R] >>\nendobj\n',
    // 4: Font
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    // 5: Contents
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    // 6: Link Annotation
    '6 0 obj\n<< /Type /Annot /Subtype /Link /Rect [50 660 400 680] /A << /S /URI /URI (http://apollo-hospitals-recruit.xyz/verify) >> >>\nendobj\n',
  ];

  let pdfBody = '%PDF-1.4\n';
  const xrefOffsets = [0];

  for (const obj of objects) {
    xrefOffsets.push(Buffer.byteLength(pdfBody));
    pdfBody += obj;
  }

  const xrefStart = Buffer.byteLength(pdfBody);
  pdfBody += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
    pdfBody += `${offsetStr} 00000 n \n`;
  }

  pdfBody += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdfBody, 'utf-8');
}

const outputPath = path.resolve('scripts/job-samples/sample_job.pdf');
fs.writeFileSync(outputPath, createSamplePdf());
console.log('Sample PDF generated at:', outputPath);
