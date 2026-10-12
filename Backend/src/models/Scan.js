// ==============================================================================
// PRIVACY-FIRST AUDIT MODEL:
// NEVER store raw messages, audio, PDF text, URLs with tokens or phone numbers
// in this model. Only high-level mathematical telemetry and threat metadata.
// ==============================================================================

import mongoose from 'mongoose';

const SignalSubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 80,
      required: true,
      trim: true,
    },
    detail: {
      type: String,
      maxlength: 300,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  { _id: false }
);

const ScanSchema = new mongoose.Schema(
  {
    shield: {
      type: String,
      enum: ['voice', 'job', 'sim', 'fusion'],
      required: true,
      index: true,
    },
    risk: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    threat: {
      type: String,
      required: true,
      trim: true,
    },
    signals: {
      type: [SignalSubSchema],
      validate: [
        (val) => Array.isArray(val) && val.length <= 20,
        '{PATH} exceeds the maximum limit of 20 signals',
      ],
      default: [],
    },
    summary: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 30 * 24 * 60 * 60 }, // 30-day TTL auto-cleanup
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

export const Scan = mongoose.models.Scan || mongoose.model('Scan', ScanSchema);

export default Scan;
