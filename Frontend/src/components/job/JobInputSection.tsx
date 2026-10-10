import React, { useState, useRef, useCallback } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { MagneticButton } from '../ui/MagneticButton';
import { FileUp, FileText, X, AlertCircle } from 'lucide-react';
import {
  SAMPLE_SCAM_HOSPITAL,
  SAMPLE_SCAM_PDF_TEXT,
  SAMPLE_SAFE_OFFER,
} from '../../services/mocks/jobSamples';

export interface JobInputSectionProps {
  onScan: (data: { text: string; file: File | null }) => void;
}

const MAX_CHARS = 5000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const JobInputSection: React.FC<JobInputSectionProps> = React.memo(({ onScan }) => {
  const [activeTab, setActiveTab] = useState<'message' | 'pdf'>('message');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const setJobInput = useAnalysisStore((s) => s.setJobInput);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setJobInput({ text: val, fileName: file?.name || null });
  };

  const validateAndSetFile = useCallback((f: File) => {
    setFileError(null);
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setFileError('Invalid file type. Only PDF documents (.pdf) are accepted.');
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      return;
    }
    setFile(f);
    // In mock mode, associate file with sample PDF text
    setJobInput({ text: SAMPLE_SCAM_PDF_TEXT, fileName: f.name });
  }, [setJobInput]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [validateAndSetFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setJobInput({ text, fileName: null });
  };

  const handleLoadSample = (sampleText: string, isPdf = false) => {
    if (isPdf) {
      setActiveTab('pdf');
      // Create a simulated PDF File object
      const dummyPdf = new File(['%PDF-1.4 simulated binary data'], 'Hospital_Offer_Letter_2026.pdf', {
        type: 'application/pdf',
      });
      setFile(dummyPdf);
      setFileError(null);
      setText('');
      setJobInput({ text: sampleText, fileName: dummyPdf.name });
    } else {
      setActiveTab('message');
      setFile(null);
      setFileError(null);
      setText(sampleText);
      setJobInput({ text: sampleText, fileName: null });
    }
  };

  const handleClear = () => {
    setText('');
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setJobInput({ text: '', fileName: null });
  };

  const isTextTooLong = text.length > MAX_CHARS;
  const hasValidInput = (activeTab === 'message' && text.trim().length > 0 && !isTextTooLong) || (activeTab === 'pdf' && !!file);

  const handleSubmit = () => {
    if (!hasValidInput) return;
    const effectiveText = activeTab === 'pdf' ? (text.trim() || SAMPLE_SCAM_PDF_TEXT) : text;
    onScan({ text: effectiveText, file });
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
      {/* Left Column: Tab switcher + Input area */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
        {/* Tab Switcher */}
        <div className="flex items-center gap-8 border-b border-[#0A0A0A] relative pb-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'message'}
            aria-controls="panel-message"
            onClick={() => setActiveTab('message')}
            className={`font-['Inter_Tight'] font-semibold text-sm sm:text-base tracking-wide transition-colors duration-200 cursor-pointer bg-transparent border-none py-1 ${
              activeTab === 'message' ? 'text-[#0A0A0A]' : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            <span>MESSAGE</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pdf'}
            aria-controls="panel-pdf"
            onClick={() => setActiveTab('pdf')}
            className={`font-['Inter_Tight'] font-semibold text-sm sm:text-base tracking-wide transition-colors duration-200 cursor-pointer bg-transparent border-none py-1 ${
              activeTab === 'pdf' ? 'text-[#0A0A0A]' : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            <span>PDF OFFER</span>
          </button>

          {/* Underline slider */}
          <div
            className="absolute bottom-[-1px] left-0 h-[2px] bg-[#F5B800] transition-transform duration-300 ease-out"
            style={{
              width: activeTab === 'message' ? '76px' : '96px',
              transform: activeTab === 'message' ? 'translateX(0px)' : 'translateX(108px)',
            }}
          />
        </div>

        {/* Tab Panels */}
        {activeTab === 'message' ? (
          <div id="panel-message" role="tabpanel" className="relative flex flex-col">
            <div className="relative bg-white rounded-[20px] border border-[#0A0A0A] p-4 sm:p-6 overflow-hidden">
              <label htmlFor="job-message-input" className="sr-only">
                Paste WhatsApp, SMS or Email job offer
              </label>
              <textarea
                id="job-message-input"
                rows={9}
                value={text}
                onChange={handleTextChange}
                placeholder="Paste the WhatsApp / SMS / email job offer here...&#10;&#10;e.g. 'Careers Desk, Hospital Shortlist: Ward Coordinator, Rs 85,000/month, pay Rs 2,999 registration fee via UPI...'"
                className="w-full bg-transparent resize-y outline-none font-['Inter_Tight'] text-sm sm:text-base text-[#0A0A0A] placeholder-[#6B6F76]/60 leading-relaxed border-none focus:ring-0"
              />

              {/* Character counter & helper */}
              <div className="flex items-center justify-between pt-3 border-t border-[#0A0A0A]/10 mt-2 text-xs">
                <span className="font-mono-label text-[11px] text-[#6B6F76]">
                  WHATSAPP · SMS · LINKEDIN · EMAIL
                </span>

                <span
                  className={`font-mono-label text-[11px] tabular-nums ${
                    isTextTooLong ? 'text-[#E11D2E] font-bold' : 'text-[#6B6F76]'
                  }`}
                >
                  {text.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            {isTextTooLong && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#E11D2E] font-mono-label">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Text exceeds 5,000 characters limit. Please shorten the input.</span>
              </div>
            )}
          </div>
        ) : (
          <div id="panel-pdf" role="tabpanel" className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload-input"
            />

            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[220px] rounded-[20px] border-2 border-dashed transition-colors duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none bg-white ${
                  isDragOver
                    ? 'border-[#F5B800] bg-[#F5B800]/5'
                    : 'border-[#0A0A0A]/30 hover:border-[#0A0A0A]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#F5B800]/15 flex items-center justify-center mb-3">
                  <FileUp className="w-6 h-6 text-[#0A0A0A]" />
                </div>
                <h3 className="font-['Inter_Tight'] font-semibold text-base text-[#0A0A0A] mb-1">
                  Drag and drop your PDF offer letter here
                </h3>
                <p className="text-xs text-[#6B6F76] mb-3">
                  or <span className="text-[#0037FF] font-semibold underline">browse file</span> from your device
                </p>
                <span className="font-mono-label text-[10px] text-[#6B6F76]/80">
                  PDF ONLY · MAX 5 MB · LOCAL INTAKE
                </span>
              </div>
            ) : (
              <div className="w-full bg-white rounded-[20px] border border-[#0A0A0A] p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#F5B800]/15 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-['Inter_Tight'] font-semibold text-sm text-[#0A0A0A] truncate">
                      {file.name}
                    </span>
                    <span className="font-mono-label text-[11px] text-[#6B6F76]">
                      {(file.size / 1024).toFixed(1)} KB · READY FOR FORENSIC SCAN
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove uploaded file"
                  className="p-2 rounded-lg hover:bg-[#F0F0F0] text-[#6B6F76] hover:text-[#0A0A0A] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {fileError && (
              <div className="p-3 rounded-xl bg-[#E11D2E]/10 border border-[#E11D2E]/30 flex items-center gap-2 text-xs text-[#E11D2E] font-['Inter_Tight']">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: "TRY A SAMPLE" Panel + Actions */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A] mb-4">
            <MonoLabel color="accent" className="text-xs font-semibold tracking-wider">
              TRY A SAMPLE
            </MonoLabel>
            <span className="font-mono-label text-[11px] text-[#6B6F76]">
              TEST PAYLOADS
            </span>
          </div>

          {/* Sample 1: Fake hospital job */}
          <HairlineRow
            borderTop={false}
            borderBottom={true}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample(SAMPLE_SCAM_HOSPITAL, false)}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#E11D2E] font-semibold tracking-wider">
                FAKE HOSPITAL JOB · REGISTRATION FEE
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Ward Coordinator · Rs 85,000/mo · UPI fee demand
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#0A0A0A] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>

          {/* Sample 2: Fake nursing offer PDF text */}
          <HairlineRow
            borderTop={false}
            borderBottom={true}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample(SAMPLE_SCAM_PDF_TEXT, true)}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#E11D2E] font-semibold tracking-wider">
                FAKE NURSING OFFER · PDF STYLE TEXT
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Senior Nurse Gulf placement · Medical clearance deposit
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#0A0A0A] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>

          {/* Sample 3: Genuine HR email */}
          <HairlineRow
            borderTop={false}
            borderBottom={false}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample(SAMPLE_SAFE_OFFER, false)}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#16A34A] font-semibold tracking-wider">
                GENUINE HR EMAIL
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Apex Health Systems · Verified interview schedule
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#0A0A0A] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <MagneticButton
              onClick={handleSubmit}
              disabled={!hasValidInput}
              variant="primary"
              size="lg"
              className="flex-1 rounded-[16px] text-sm font-semibold"
            >
              SCAN OFFER
            </MagneticButton>

            {(text || file) && (
              <button
                type="button"
                onClick={handleClear}
                className="font-mono-label text-xs text-[#6B6F76] hover:text-[#0A0A0A] tracking-wider uppercase transition-colors cursor-pointer bg-transparent border-none py-3 px-2 flex items-center gap-1 group"
              >
                <span>CLEAR</span>
                <span className="transition-transform group-hover:translate-x-0.5">↗</span>
              </button>
            )}
          </div>

          <p className="text-xs text-[#6B6F76] font-['Inter_Tight'] leading-relaxed">
            Demo uses synthetic samples. Nothing you paste is stored.
          </p>
        </div>
      </div>
    </div>
  );
});

JobInputSection.displayName = 'JobInputSection';
