import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { MagneticButton } from '../ui/MagneticButton';
import { WaveformPreview } from './WaveformPreview';
import { extractWaveformPeaks, generateSyntheticPeaks } from '../../utils/audioDecoder';
import {
  UploadCloud,
  Mic,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface VoiceInputSectionProps {
  onAnalyze: (data: {
    file?: File | Blob | null;
    sampleId?: string | null;
    fileName?: string | null;
    duration?: number | null;
  }) => void;
  isAnalyzing?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DURATION_SEC = 60;
const MAX_RECORD_SEC = 30;

export const VoiceInputSection: React.FC<VoiceInputSectionProps> = React.memo(({ onAnalyze, isAnalyzing = false }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');

  // Audio state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [sampleMissingNote, setSampleMissingNote] = useState<string | null>(null);

  // Errors & notices
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Refs for recorder & live meter
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterBarRef = useRef<HTMLDivElement | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (meterRafRef.current) cancelAnimationFrame(meterRafRef.current);
    };
  }, []);

  const updateAudioUrl = (newUrl: string | null) => {
    if (audioUrlRef.current && audioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = newUrl;
    setAudioUrl(newUrl);
  };

  // ----------------------------------------------------
  // File Upload Handlers
  // ----------------------------------------------------
  const handleFileProcess = async (file: File) => {
    setInlineError(null);
    setSampleMissingNote(null);
    setSelectedSampleId(null);

    // Validate mime type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
    const hasAudioExt = /\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !hasAudioExt && !file.type.startsWith('audio/')) {
      setInlineError('Unsupported format. Please upload an MP3, WAV, M4A, or OGG audio file.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setInlineError(`Audio file too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max limit is 10 MB.`);
      return;
    }

    try {
      const { peaks: decodedPeaks, duration } = await extractWaveformPeaks(file, 120);

      // Validate duration
      if (duration > MAX_DURATION_SEC) {
        setInlineError(`Audio duration (${Math.round(duration)}s) exceeds 60 seconds limit. Please trim the file.`);
        return;
      }

      setSelectedFile(file);
      setRecordedBlob(null);
      setPeaks(decodedPeaks);
      setAudioDuration(duration);

      const objectUrl = URL.createObjectURL(file);
      updateAudioUrl(objectUrl);
    } catch (err) {
      console.warn('Decode fallback:', err);
      // Fallback synthetic peaks if browser codecs fail
      setSelectedFile(file);
      setRecordedBlob(null);
      setPeaks(generateSyntheticPeaks(120, 0.4));
      setAudioDuration(15);
      const objectUrl = URL.createObjectURL(file);
      updateAudioUrl(objectUrl);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ----------------------------------------------------
  // Live Microphone Recording Handlers
  // ----------------------------------------------------
  const startRecording = async () => {
    setInlineError(null);
    setSampleMissingNote(null);
    setSelectedSampleId(null);
    setSelectedFile(null);
    setRecordedBlob(null);
    setPeaks([]);
    updateAudioUrl(null);

    // Check secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setInlineError('Microphone recording requires a secure HTTPS connection or localhost. Please upload an audio file instead.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setInlineError('Audio recording is not supported in this browser. Please upload an audio file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup Web Audio Analyser for live level meter (scaleX transform, zero state ticks)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const scale = Math.max(0.04, Math.min(1, avg / 128));

        if (meterBarRef.current) {
          meterBarRef.current.style.transform = `scaleX(${scale})`;
        }
        meterRafRef.current = requestAnimationFrame(updateMeter);
      };
      meterRafRef.current = requestAnimationFrame(updateMeter);

      // Start MediaRecorder
      const chunks: BlobPart[] = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop live stream tracks
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        if (meterRafRef.current) cancelAnimationFrame(meterRafRef.current);
        if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});

        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);

        try {
          const { peaks: decodedPeaks, duration } = await extractWaveformPeaks(blob, 120);
          setPeaks(decodedPeaks);
          setAudioDuration(duration);
        } catch {
          setPeaks(generateSyntheticPeaks(120, 0.8));
          setAudioDuration(recordSeconds || 5);
        }

        const objectUrl = URL.createObjectURL(blob);
        updateAudioUrl(objectUrl);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      // 1-second elapsed timer (capped at 30 seconds)
      let elapsed = 0;
      recordTimerRef.current = window.setInterval(() => {
        elapsed += 1;
        setRecordSeconds(elapsed);
        if (elapsed >= MAX_RECORD_SEC) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setInlineError('Microphone permission denied. Please allow microphone access or upload an audio file instead.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setInlineError('No microphone found on your system. Please connect an audio input or upload a file.');
      } else {
        setInlineError('Unable to access microphone. Please check your browser permissions or use file upload.');
      }
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ----------------------------------------------------
  // Sample Loader Handlers
  // ----------------------------------------------------
  const handleLoadSample = async (sampleId: 'ai_deepfake' | 'real_human' | 'patient_support') => {
    setInlineError(null);
    setSampleMissingNote(null);
    setSelectedFile(null);
    setRecordedBlob(null);
    setSelectedSampleId(sampleId);

    const sampleUrl = sampleId === 'real_human' ? '/samples/real_human.m4a' : '/samples/ai_deepfake.mp3';

    try {
      const res = await fetch(sampleUrl);
      if (!res.ok) {
        throw new Error('404');
      }
      const blob = await res.blob();
      const fileName = sampleId === 'real_human' ? 'Verified_Human_Voice.m4a' : 'Fake_Doctor_Call_AI.mp3';
      const file = new File([blob], fileName, {
        type: blob.type || (sampleId === 'real_human' ? 'audio/mp4' : 'audio/mpeg'),
      });
      setSelectedFile(file);

      const { peaks: decodedPeaks, duration } = await extractWaveformPeaks(blob, 120);
      setPeaks(decodedPeaks);
      setAudioDuration(duration);
      const objUrl = URL.createObjectURL(blob);
      updateAudioUrl(objUrl);
    } catch {
      // 404 or missing audio file: run mock flow with synthetic peaks and friendly note
      setSampleMissingNote('Sample audio file not found, using demo result only.');
      setPeaks(generateSyntheticPeaks(120, sampleId === 'real_human' ? 0.2 : 0.9));
      setAudioDuration(sampleId === 'real_human' ? 22 : 18);
      updateAudioUrl(null);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setRecordedBlob(null);
    setSelectedSampleId(null);
    setPeaks([]);
    setAudioDuration(null);
    setInlineError(null);
    setSampleMissingNote(null);
    updateAudioUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasAudioInput = Boolean(selectedFile || recordedBlob || selectedSampleId);

  const handleSubmit = () => {
    if (!hasAudioInput || isAnalyzing) return;

    if (selectedSampleId) {
      onAnalyze({
        file: selectedFile,
        sampleId: selectedSampleId,
        fileName:
          selectedSampleId === 'ai_deepfake'
            ? 'Fake_Doctor_Call_AI.mp3'
            : selectedSampleId === 'real_human'
            ? 'Verified_Human_Voice.m4a'
            : 'Patient_Support_Synthetic.mp3',
        duration: audioDuration || 18,
      });
    } else if (recordedBlob) {
      const recFile = new File([recordedBlob], 'Live_Microphone_Capture.webm', {
        type: recordedBlob.type || 'audio/webm',
      });
      onAnalyze({
        file: recFile,
        fileName: 'Live_Microphone_Capture.webm',
        duration: audioDuration || recordSeconds,
      });
    } else if (selectedFile) {
      onAnalyze({
        file: selectedFile,
        fileName: selectedFile.name,
        duration: audioDuration,
      });
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start mb-16">
      {/* Left Column: Tab switcher + Upload/Record Intake */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
        {/* Tab Switcher with sliding transform underline */}
        <div className="flex items-center gap-8 border-b border-[#0A0A0A] relative pb-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upload'}
            aria-controls="panel-upload"
            onClick={() => setActiveTab('upload')}
            className={`font-['Inter_Tight'] font-semibold text-sm sm:text-base tracking-wide transition-colors cursor-pointer bg-transparent border-none py-1 ${
              activeTab === 'upload' ? 'text-[#0A0A0A]' : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            <span>UPLOAD</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'record'}
            aria-controls="panel-record"
            onClick={() => setActiveTab('record')}
            className={`font-['Inter_Tight'] font-semibold text-sm sm:text-base tracking-wide transition-colors cursor-pointer bg-transparent border-none py-1 ${
              activeTab === 'record' ? 'text-[#0A0A0A]' : 'text-[#6B6F76] hover:text-[#0A0A0A]'
            }`}
          >
            <span>RECORD LIVE</span>
          </button>

          {/* Underline Slider */}
          <div
            className="absolute bottom-[-1px] left-0 h-[2px] bg-[#3B5BFF] transition-transform duration-300 ease-out"
            style={{
              width: activeTab === 'upload' ? '68px' : '108px',
              transform: activeTab === 'upload' ? 'translateX(0px)' : 'translateX(100px)',
            }}
          />
        </div>

        {/* Tab Panels */}
        {activeTab === 'upload' ? (
          <div id="panel-upload" role="tabpanel" className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
              onChange={handleFileSelect}
              className="hidden"
              id="voice-upload-input"
            />

            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative bg-white rounded-[20px] border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center gap-4 ${
                  isDragOver
                    ? 'border-[#3B5BFF] bg-[#3B5BFF]/5'
                    : 'border-[#0A0A0A]/30 hover:border-[#0A0A0A]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#F0F0F0] flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-[#3B5BFF]" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-['Inter_Tight'] font-medium text-base text-[#0A0A0A]">
                    Drag & Drop Audio Call File or <span className="text-[#3B5BFF] underline underline-offset-4">Browse</span>
                  </span>
                  <span className="font-mono-label text-xs text-[#6B6F76]">
                    MP3, WAV, M4A, OGG · MAX 10 MB · MAX 60 SECONDS
                  </span>
                </div>
              </div>
            ) : (
              <WaveformPreview
                peaks={peaks}
                audioUrl={audioUrl}
                duration={audioDuration}
                fileName={selectedFile.name}
                onClear={handleClear}
              />
            )}
          </div>
        ) : (
          <div id="panel-record" role="tabpanel" className="flex flex-col gap-4">
            <div className="bg-white rounded-[20px] border border-[#0A0A0A] p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6">
              {!isRecording && !recordedBlob ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-['Inter_Tight'] font-medium text-base sm:text-lg text-[#0A0A0A]">
                      Capture Live Audio for Threat Verification
                    </span>
                    <span className="font-mono-label text-xs text-[#6B6F76]">
                      MAXIMUM 30 SECONDS · PROCESSED LOCALLY
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0A0A0A] hover:bg-[#3B5BFF] text-white flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 group shadow-lg"
                    aria-label="Start audio recording"
                  >
                    <Mic className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-[9px] font-bold tracking-widest uppercase">
                      REC
                    </span>
                  </button>
                </>
              ) : isRecording ? (
                <div className="w-full flex flex-col items-center gap-6">
                  {/* Elapsed Timer */}
                  <div className="flex items-center gap-2 text-2xl sm:text-3xl font-mono font-bold text-[#0A0A0A]">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-pulse" />
                    <span>00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}</span>
                    <span className="text-xs text-[#6B6F76] font-normal">/ 00:30</span>
                  </div>

                  {/* High-performance live level meter bar (pure transform scaleX, zero React re-renders) */}
                  <div className="w-full max-w-sm h-3 bg-[#F0F0F0] rounded-full overflow-hidden border border-[#0A0A0A]/10">
                    <div
                      ref={meterBarRef}
                      className="h-full bg-[#3B5BFF] rounded-full"
                      style={{
                        transform: 'scaleX(0.04)',
                        transformOrigin: 'left',
                        willChange: 'transform',
                      }}
                    />
                  </div>

                  {/* Stop Button */}
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#EF4444] hover:bg-[#dc2626] text-white font-mono text-xs font-bold tracking-widest uppercase transition-colors"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>STOP RECORDING</span>
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#0A0A0A]/10">
                    <span className="font-mono-label text-xs text-[#10B981] flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      RECORDING CAPTURED ({Math.round(audioDuration || recordSeconds)}s)
                    </span>

                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6B6F76] hover:text-[#0A0A0A] uppercase transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>RE-RECORD</span>
                    </button>
                  </div>

                  <WaveformPreview
                    peaks={peaks}
                    audioUrl={audioUrl}
                    duration={audioDuration || recordSeconds}
                    fileName="Microphone_Call_Capture.webm"
                    onClear={handleClear}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inline Error Chip */}
        {inlineError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs font-mono text-[#DC2626]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{inlineError}</div>
          </div>
        )}

        {/* Sample Missing Fallback Note */}
        {sampleMissingNote && (
          <div className="p-3 rounded-xl bg-[#3B5BFF]/10 border border-[#3B5BFF]/20 text-xs font-mono text-[#3B5BFF]">
            * {sampleMissingNote}
          </div>
        )}
      </div>

      {/* Right Column: TRY A SAMPLE & Submit Actions */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
        <div className="p-6 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#0A0A0A] mb-2">
            <MonoLabel color="accent">TRY A SAMPLE</MonoLabel>
            <span className="font-mono-label text-[11px] text-[#6B6F76]">ACOUSTIC TESTS</span>
          </div>

          {/* Sample 1: AI Deepfake Doctor Call */}
          <HairlineRow
            borderTop={false}
            borderBottom={true}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample('ai_deepfake')}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#EF4444] font-semibold tracking-wider">
                AI-GENERATED VOICE · FAKE DOCTOR CALL
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Cloned Hospital Physician · Emergency Fee Urgency
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#3B5BFF] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>

          {/* Sample 2: Real Human Voice */}
          <HairlineRow
            borderTop={false}
            borderBottom={true}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample('real_human')}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#10B981] font-semibold tracking-wider">
                REAL HUMAN VOICE
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Authentic Clinical Consultation · Organic Jitter
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#3B5BFF] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>

          {/* Sample 3: Suspicious Patient-Support Call */}
          <HairlineRow
            borderTop={false}
            borderBottom={false}
            className="py-3.5 px-1 group"
            onClick={() => handleLoadSample('patient_support')}
          >
            <div className="flex flex-col text-left">
              <span className="font-mono-label text-[11px] text-[#F59E0B] font-semibold tracking-wider">
                SUSPICIOUS PATIENT-SUPPORT CALL
              </span>
              <span className="font-['Inter_Tight'] font-normal text-xs text-[#6B6F76] group-hover:text-[#0A0A0A] transition-colors mt-0.5">
                Conversational Voicebot · Robotic Flat Energy
              </span>
            </div>
            <span className="font-mono-label text-xs text-[#0A0A0A]/40 group-hover:text-[#3B5BFF] transition-colors shrink-0">
              LOAD ↗
            </span>
          </HairlineRow>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <MagneticButton
              onClick={handleSubmit}
              disabled={!hasAudioInput || isRecording || isAnalyzing}
              variant="primary"
              size="lg"
              className="flex-1 rounded-[16px] text-sm font-semibold"
            >
              {isAnalyzing ? 'ANALYZING AUDIO...' : 'ANALYZE VOICE'}
            </MagneticButton>

            {hasAudioInput && !isRecording && (
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
            Demo audio is synthetic. Nothing you record is stored or uploaded in demo mode.
          </p>
        </div>
      </div>
    </div>
  );
});

VoiceInputSection.displayName = 'VoiceInputSection';
