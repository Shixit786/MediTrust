/**
 * job.controller.js - Controller for Job Shield POST /api/job/analyze.
 * Coordinates input validation (text vs. PDF), rule extraction,
 * local URL heuristics, LLM second opinion, and privacy-preserving audit logging.
 */

import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { saveScan } from '../utils/saveScan.js';
import { parsePdfBuffer } from '../services/pdf.service.js';
import { analyzeText } from '../services/scamRules.js';
import { analyzeUrls } from '../services/urlTools.js';
import { enrichUrls } from '../services/intel/intel.service.js';
import { getJobAiAnalysis } from '../services/jobAi.service.js';
import { buildJobResult } from '../services/jobResult.service.js';
import { extractCompanyName } from '../services/company/normalize.js';
import { extractContactDomains } from '../services/company/domainConsistency.js';
import { verifyCompany, refineCompanyVerification } from '../services/company/company.service.js';

/**
 * POST /api/job/analyze
 * Analyzes pasted job/message text or uploaded PDF file for employment fraud,
 * medical emergency extortion, and credential phishing patterns.
 */
export const analyzeJob = asyncHandler(async (req, res) => {
  const startTime = Date.now();

  const hasFile = Boolean(req.file);
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const hasText = rawText.length > 0;

  // 1. Mutual exclusivity & input validation
  if (hasFile && hasText) {
    throw new ApiError(400, 'BAD_REQUEST', 'Send either text or a PDF');
  }

  if (!hasFile && !hasText) {
    throw new ApiError(400, 'NO_INPUT', 'Send either text or a PDF');
  }

  let inputType = 'text';
  let extractedText = '';
  let pdfMeta = null;
  let extraUrls = [];

  if (hasFile) {
    inputType = 'pdf';
    // parsePdfBuffer verifies %PDF- magic bytes, handles 10-page ceiling & 8s timeout
    const pdfResult = await parsePdfBuffer(req.file.buffer);
    extractedText = pdfResult.text;
    pdfMeta = pdfResult.meta;
    extraUrls = pdfResult.links || [];
  } else {
    inputType = 'text';
    if (rawText.length < 20) {
      throw new ApiError(
        422,
        'TEXT_TOO_SHORT',
        'Text must be at least 20 characters long'
      );
    }
    extractedText = rawText.length > 5000 ? rawText.slice(0, 5000) : rawText;
  }

  // 2. Rule engine evaluation (red flags, highlights, emergency claims)
  const rulesAnalysis = analyzeText(extractedText);

  // 3. Local URL heuristics & contact domain extraction
  const initialUrlAnalysis = analyzeUrls(extractedText, extraUrls);
  const contactDomains = extractContactDomains(extractedText, extraUrls);
  const prelimCompanyName = extractCompanyName(extractedText, null);

  // 4. Parallel execution: URL threat enrichment, LLM second opinion & Company verification
  const [urlAnalysis, aiAnalysis, prelimCompanyAnalysis] = await Promise.all([
    enrichUrls(initialUrlAnalysis),
    getJobAiAnalysis({
      text: extractedText,
      rulesScore: rulesAnalysis.rulesScore,
      categories: rulesAnalysis.categories,
    }),
    verifyCompany({
      text: extractedText,
      name: prelimCompanyName,
      contactDomains,
    }).catch(() => ({
      name: prelimCompanyName,
      checks: [],
      company_score: 0,
      note: 'Company verification unavailable.',
    })),
  ]);

  // 5. Refine company verification with LLM company_name without repeated external calls
  const companyAnalysis = refineCompanyVerification(
    prelimCompanyAnalysis,
    aiAnalysis?.company_name,
    contactDomains
  );

  // 6. Aggregate final scoring and produce standardized ShieldResult shape
  const result = buildJobResult({
    inputType,
    pdfMeta,
    extractedText,
    rulesAnalysis,
    urlAnalysis,
    aiAnalysis,
    companyAnalysis,
  });

  // 6. Privacy-preserving fire-and-forget scan persistence
  // NEVER stores user text, URLs, file names, or company names
  const summaryText = (result.ai?.summary_en || result.extra?.ai?.summary_en || '').slice(0, 300);
  saveScan({
    shield: 'job',
    risk: result.risk,
    level: result.level,
    threat: result.threat,
    signals: result.signals.slice(0, 5),
    summary: summaryText,
  });

  // 7. Privacy-compliant operational telemetry logging
  const totalMs = Date.now() - startTime;
  logger.info(
    `[Job Shield] type=${inputType} len=${extractedText.length} urls=${urlAnalysis.length} companyFound=${Boolean(companyAnalysis?.name)} llmProvider=${aiAnalysis.provider} totalMs=${totalMs} code=OK`
  );

  return ok(res, result);
});

export default {
  analyzeJob,
};
