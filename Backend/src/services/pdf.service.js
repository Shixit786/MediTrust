/**
 * pdf.service.js - Server-side PDF extraction with unpdf.
 * Extracts selectable text (up to 10 pages) and embedded link annotations.
 * Never logs or stores original file names or PDF contents.
 */

import { getDocumentProxy } from 'unpdf';
import { ApiError } from '../utils/ApiError.js';

const PDF_MAGIC_BYTES = '%PDF-';
const MAX_PAGES_TO_PARSE = 10;
const MAX_TEXT_CHARS = 5000;
const PARSE_TIMEOUT_MS = 8000;

/**
 * Validates PDF signature and extracts selectable text and link annotations.
 *
 * @param {Buffer} buffer Uploaded PDF file buffer
 * @returns {Promise<{ text: string, links: string[], meta: { pages: number, truncated: boolean } }>}
 * @throws {ApiError} 415 UNSUPPORTED_MEDIA, 422 PDF_UNREADABLE, 422 PDF_NO_TEXT
 */
export async function parsePdfBuffer(buffer) {
  // 1. Magic bytes verification
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString('ascii') !== PDF_MAGIC_BYTES
  ) {
    throw new ApiError(
      415,
      'UNSUPPORTED_MEDIA',
      'File content does not match PDF format'
    );
  }

  // 2. Timeout-bounded processing
  const parsePromise = (async () => {
    let pdfDoc;
    try {
      pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
    } catch {
      throw new ApiError(
        422,
        'PDF_UNREADABLE',
        'PDF document is corrupted, password-protected, or unreadable'
      );
    }

    const totalPages = pdfDoc.numPages || 0;
    if (totalPages === 0) {
      throw new ApiError(
        422,
        'PDF_NO_TEXT',
        'This PDF has no selectable text. OCR is not supported yet.'
      );
    }

    const pagesToParse = Math.min(totalPages, MAX_PAGES_TO_PARSE);
    const textChunks = [];
    const embeddedLinks = [];

    for (let pageNum = 1; pageNum <= pagesToParse; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStr = (textContent.items || [])
          .map((item) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ');

        if (pageStr.trim().length > 0) {
          textChunks.push(pageStr.trim());
        }

        // Extract link annotations
        const annotations = await page.getAnnotations();
        for (const annot of annotations || []) {
          if (annot.url && typeof annot.url === 'string') {
            embeddedLinks.push(annot.url);
          } else if (annot.unsafeUrl && typeof annot.unsafeUrl === 'string') {
            embeddedLinks.push(annot.unsafeUrl);
          }
        }
      } catch {
        // If a page cannot be decoded
        throw new ApiError(
          422,
          'PDF_UNREADABLE',
          'PDF page contents could not be decoded'
        );
      }
    }

    // Normalise whitespace: collapse repeated spaces/tabs, normalize newlines
    const rawCombined = textChunks
      .join('\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!rawCombined || rawCombined.length === 0) {
      throw new ApiError(
        422,
        'PDF_NO_TEXT',
        'This PDF has no selectable text. OCR is not supported yet.'
      );
    }

    let finalText = rawCombined;
    let truncated = false;

    if (finalText.length > MAX_TEXT_CHARS) {
      finalText = finalText.slice(0, MAX_TEXT_CHARS);
      truncated = true;
    }

    return {
      text: finalText,
      links: embeddedLinks,
      meta: {
        pages: pagesToParse,
        truncated,
      },
    };
  })();

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new ApiError(
          422,
          'PDF_UNREADABLE',
          `PDF processing timed out after ${PARSE_TIMEOUT_MS / 1000} seconds`
        )
      );
    }, PARSE_TIMEOUT_MS);
    timer.unref();
  });

  return Promise.race([parsePromise, timeoutPromise]);
}
