// Subtle D-minor / F-major ambient harmonic progression (30s per chord across 300s)
const CHORDS: number[][] = [
  [146.83, 220.0, 261.63, 349.23], // Dm7
  [116.54, 174.61, 220.0, 293.66], // Bbmaj7
  [130.81, 196.0, 246.94, 329.63], // Cmaj7/G
  [110.0, 164.81, 220.0, 261.63],  // Am7
  [146.83, 220.0, 293.66, 349.23], // Dm(add9)
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [130.81, 196.0, 261.63, 329.63], // C
  [116.54, 174.61, 220.0, 293.66], // Bbmaj7
  [110.0, 164.81, 220.0, 329.63],  // Am
  [146.83, 220.0, 293.66, 440.0],  // Dm9 resolution
];

export class DocumentaryMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private isRunning = false;
  private volume = 0.28; // Subtle voiceover-friendly default
  private muted = false;

  private ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.lowpass = this.ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 900;
    this.lowpass.Q.value = 0.7;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.lowpass.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // 4 warm dual-detuned voices (8 oscillators)
    for (let i = 0; i < 4; i++) {
      const g = this.ctx.createGain();
      g.gain.value = i === 0 ? 0.28 : 0.19;
      g.connect(this.lowpass);

      const o1 = this.ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = CHORDS[0][i];

      const o2 = this.ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = CHORDS[0][i] * 1.0018;

      const triGain = this.ctx.createGain();
      triGain.gain.value = 0.16;

      o1.connect(g);
      o2.connect(triGain);
      triGain.connect(g);

      o1.start();
      o2.start();
      this.oscs.push(o1, o2);
      this.oscGains.push(g);
    }
  }

  start(currentSec: number) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.isRunning = true;
    this.syncToTime(currentSec);
    const target = this.muted ? 0 : this.volume * 0.22;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.45);
  }

  pause() {
    if (!this.ctx || !this.masterGain) return;
    this.isRunning = false;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && this.isRunning) {
      const target = this.muted ? 0 : this.volume * 0.22;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain && this.isRunning) {
      const target = this.muted ? 0 : this.volume * 0.22;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    }
  }

  syncToTime(tSec: number) {
    if (!this.ctx || this.oscs.length < 8) return;
    const clamped = Math.max(0, Math.min(299.9, tSec));
    const chordIdx = Math.min(CHORDS.length - 1, Math.floor(clamped / 30));
    const freqs = CHORDS[chordIdx];
    const now = this.ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      this.oscs[i * 2].frequency.setTargetAtTime(freqs[i], now, 0.9);
      this.oscs[i * 2 + 1].frequency.setTargetAtTime(freqs[i] * 1.0018, now, 0.9);
    }

    if (this.masterGain && this.isRunning) {
      // Gentle master fade-in (0-3s) & fade-out (295-300s)
      let env = 1;
      if (clamped < 3) env = clamped / 3;
      else if (clamped > 295) env = Math.max(0, (300 - clamped) / 5);
      const target = this.muted ? 0 : this.volume * 0.22 * env;
      this.masterGain.gain.setTargetAtTime(target, now, 0.1);
    }
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.oscs = [];
      this.oscGains = [];
    }
  }
}

/**
 * Generates an exact stereo 48kHz 16-bit PCM WAV buffer for [startSec, endSec]
 * at subtle voiceover-safe gain (-22 dBFS peak) for MP4 export.
 */
export function renderAmbientWavSegment(
  startSec: number,
  endSec: number,
  sampleRate = 48000,
): Uint8Array {
  const duration = Math.max(0.1, endSec - startSec);
  const numSamples = Math.floor(duration * sampleRate);
  const dataBytes = numSamples * 4; // stereo 16-bit
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  // RIFF/WAVE header
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  const cross = 4.0;
  const segLen = 30.0;
  const gain = 0.08; // ~ -22 dBFS voiceover-friendly level

  let byteOffset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = startSec + i / sampleRate;
    const baseIdx = Math.min(CHORDS.length - 1, Math.floor(t / segLen));
    const nextIdx = Math.min(CHORDS.length - 1, baseIdx + 1);
    const localT = t - baseIdx * segLen;
    const blend =
      localT > segLen - cross && baseIdx !== nextIdx
        ? 0.5 * (1 - Math.cos((Math.PI * (localT - (segLen - cross))) / cross))
        : 0;

    let l = 0;
    let r = 0;
    const fA = CHORDS[baseIdx];
    const fB = CHORDS[nextIdx];
    for (let k = 0; k < 4; k++) {
      const w = k === 0 ? 0.32 : 0.22;
      const f = fA[k] * (1 - blend) + fB[k] * blend;
      const vib = 1 + 0.0007 * Math.sin(2 * Math.PI * 0.14 * t + k);
      const phaseL = 2 * Math.PI * f * vib * t;
      const phaseR = 2 * Math.PI * f * 1.0018 * vib * t + 0.4;
      l += w * (Math.sin(phaseL) + 0.1 * Math.sin(2 * phaseL));
      r += w * (Math.sin(phaseR) + 0.1 * Math.sin(2 * phaseR));
    }

    const pulse = 0.9 + 0.1 * Math.sin(Math.PI * t);
    let env = 1;
    if (t < 3) env = t / 3;
    else if (t > 295) env = Math.max(0, (300 - t) / 5);

    const sampleL = Math.max(-1, Math.min(1, l * pulse * env * gain));
    const sampleR = Math.max(-1, Math.min(1, r * pulse * env * gain));
    view.setInt16(byteOffset, Math.round(sampleL * 32767), true);
    view.setInt16(byteOffset + 2, Math.round(sampleR * 32767), true);
    byteOffset += 4;
  }

  return new Uint8Array(buffer);
}
