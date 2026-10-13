import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac']);

const storage = multer.memoryStorage();

function audioFileFilter(_req, file, cb) {
  const originalName = file.originalname || '';
  const ext = path.extname(originalName).toLowerCase();

  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return cb(
      new ApiError(
        415,
        'UNSUPPORTED_MEDIA',
        `Unsupported audio format '${ext || 'unknown'}'. Allowed formats: .wav, .mp3, .m4a, .ogg, .webm, .flac`
      ),
      false
    );
  }

  return cb(null, true);
}

const audioUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
  fileFilter: audioFileFilter,
});

export const uploadAudio = audioUpload.single('audio');

// PDF Upload for Job Shield
function pdfFileFilter(_req, file, cb) {
  const originalName = file.originalname || '';
  const ext = path.extname(originalName).toLowerCase();

  if (ext !== '.pdf') {
    return cb(
      new ApiError(
        415,
        'UNSUPPORTED_MEDIA',
        `Unsupported file format '${ext || 'unknown'}'. Only PDF files are supported.`
      ),
      false
    );
  }

  return cb(null, true);
}

const pdfUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
    files: 1,
  },
  fileFilter: pdfFileFilter,
});

export const uploadPdf = pdfUpload.single('file');

/**
 * Optional PDF upload middleware: invokes multer only if the request is multipart/form-data.
 */
export function optionalPdfUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return uploadPdf(req, res, next);
  }
  return next();
}

/**
 * Sniffs the real audio format from binary header magic bytes.
 * Never trusts client Content-Type or file extension alone.
 *
 * @param {Buffer} buffer Uploaded file buffer
 * @returns {string} Detected extension (e.g. '.wav', '.mp3')
 * @throws {ApiError} 415 UNSUPPORTED_MEDIA if signature is invalid or unrecognized
 */
export function sniffAudio(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new ApiError(
      415,
      'UNSUPPORTED_MEDIA',
      'File content does not look like a supported audio format'
    );
  }

  // 1. WAV: 'RIFF' at offset 0, 'WAVE' at offset 8
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return '.wav';
  }

  // 2. MP3: 'ID3' tag at offset 0 or MPEG frame sync (0xFF 0xEx)
  if (buffer.toString('ascii', 0, 3) === 'ID3') {
    return '.mp3';
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return '.mp3';
  }

  // 3. OGG: 'OggS' at offset 0
  if (buffer.toString('ascii', 0, 4) === 'OggS') {
    return '.ogg';
  }

  // 4. FLAC: 'fLaC' at offset 0
  if (buffer.toString('ascii', 0, 4) === 'fLaC') {
    return '.flac';
  }

  // 5. WebM / Matroska: 0x1A 0x45 0xDF 0xA3 at offset 0
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return '.webm';
  }

  // 6. M4A / MP4: 'ftyp' at offset 4
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    return '.m4a';
  }

  throw new ApiError(
    415,
    'UNSUPPORTED_MEDIA',
    'File content does not look like a supported audio format'
  );
}

export default {
  uploadAudio,
  uploadPdf,
  optionalPdfUpload,
  sniffAudio,
};
