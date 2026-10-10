/**
 * High-performance audio decoder helper using Web Audio API.
 * Computes normalized waveform peak points (0..1) without blocking the main thread.
 */

export async function extractWaveformPeaks(
  audioSource: Blob | ArrayBuffer,
  numPeaks = 120
): Promise<{ peaks: number[]; duration: number }> {
  let arrayBuffer: ArrayBuffer;

  if (audioSource instanceof Blob) {
    arrayBuffer = await audioSource.arrayBuffer();
  } else {
    arrayBuffer = audioSource;
  }

  // Use AudioContext to decode audio
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported on this browser');
  }

  const audioCtx = new AudioContextClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / numPeaks);
    const peaks: number[] = new Array(numPeaks).fill(0);

    for (let i = 0; i < numPeaks; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    // Normalize peaks so highest is ~0.95
    const highest = Math.max(...peaks, 0.001);
    const normalizedPeaks = peaks.map((p) => Math.max(0.04, Math.min(1, (p / highest) * 0.95)));

    return {
      peaks: normalizedPeaks,
      duration: audioBuffer.duration,
    };
  } finally {
    // Always close audio context immediately
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Generate synthetic peak preview when audio file cannot be decoded or 404
 */
export function generateSyntheticPeaks(numPeaks = 120, seed = 0.5): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < numPeaks; i++) {
    const t = i / numPeaks;
    // Generate organic sounding speech envelope
    const envelope = Math.sin(t * Math.PI) * (0.4 + 0.5 * Math.sin(t * 12 + seed));
    const noise = (Math.sin(i * 99 + seed * 17) * 0.5 + 0.5) * 0.3;
    const val = Math.max(0.05, Math.min(0.95, Math.abs(envelope) + noise));
    peaks.push(val);
  }
  return peaks;
}
