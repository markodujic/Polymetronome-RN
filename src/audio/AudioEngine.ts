/**
 * Unified Audio Engine for polyrhythmic metronome.
 * React Native port using react-native-audio-api (Web Audio API polyfill).
 *
 * KEY DESIGN: Single time source.
 * All three click channels (A, B, micro-click) are driven from ONE shared
 * LCM-grid clock. Every cell time is computed as epoch + n × cellDuration,
 * eliminating inter-track drift by construction.
 */

import { AudioContext } from 'react-native-audio-api';

const SCHEDULE_AHEAD_TIME = 0.1; // seconds to look ahead
const SCHEDULER_INTERVAL = 25;   // ms between scheduler calls

export type BeatCallback = (beatIndex: number, time: number, trackId: number) => void;

export type ClickSound = 'sine-low' | 'sine-mid' | 'sine-high';

export interface MetronomeTrack {
  id: number;
  bpm: number;
  beats: number;
  subdivision: number;
  accents: boolean[];
  beatLevels: number[];   // per-beat volume: 1.0 | 0.5 | 0.0
  muted: boolean;
  volume: number;
  sound: ClickSound;
}

/* ---- helpers ---- */
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }

class AudioEngine {
  /* ---- Audio graph ---- */
  private ctx: AudioContext | null = null;
  // Using ReturnType to avoid depending on DOM GainNode/OscillatorNode/AudioBuffer types
  private masterGain: ReturnType<AudioContext['createGain']> | null = null;
  private gainA: ReturnType<AudioContext['createGain']> | null = null;
  private gainB: ReturnType<AudioContext['createGain']> | null = null;
  private gainMicro: ReturnType<AudioContext['createGain']> | null = null;
  private gainPulse: ReturnType<AudioContext['createGain']> | null = null;

  /* ---- volumes ---- */
  private _masterVol = 0.8;
  private _volA = 0.8;
  private _volB = 0.8;
  private _volMicro = 0.5;
  private _volPulse = 0.3;

  /* ---- pulse tone (rising sine between Track A beats) ---- */
  private activePulseOscs: ReturnType<AudioContext['createOscillator']>[] = [];
  private _pulseFreq = 1600;

  /* ---- scheduling ---- */
  private _isPlaying = false;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private onBeat: BeatCallback | null = null;

  /* ---- grid config ---- */
  private masterBpm = 120;
  private beatsA = 3;
  private beatsB = 4;
  private gridSize = 12;
  private stepA = 4;
  private stepB = 3;
  private cellDuration = 0;

  /* ---- timing ---- */
  private epoch = 0;
  private cellsFromEpoch = 0;

  /* ---- track config ---- */
  private soundA: ClickSound = 'sine-high';
  private soundB: ClickSound = 'sine-low';
  private accentsA: boolean[] = [true, false, false];
  private accentsB: boolean[] = [true, false, false, false];
  private beatLevelsB: number[] = [1, 1, 1, 1];

  /* ---- micro-accent ---- */
  private microAccents: boolean[] = [];

  /* ---- buffers ---- */
  private soundBuffers: Map<
    ClickSound,
    { normal: ReturnType<AudioContext['createBuffer']>; accent: ReturnType<AudioContext['createBuffer']> }
  > = new Map();
  private accentTickBuffer: ReturnType<AudioContext['createBuffer']> | null = null;

  /* ================================================================
   *  Init
   * ================================================================ */

  async init(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._masterVol;
      this.masterGain.connect(this.ctx.destination);

      this.gainA = this.ctx.createGain();
      this.gainA.gain.value = this._volA;
      this.gainA.connect(this.masterGain);

      this.gainB = this.ctx.createGain();
      this.gainB.gain.value = this._volB;
      this.gainB.connect(this.masterGain);

      this.gainMicro = this.ctx.createGain();
      this.gainMicro.gain.value = this._volMicro;
      this.gainMicro.connect(this.masterGain);

      this.gainPulse = this.ctx.createGain();
      this.gainPulse.gain.value = this._volPulse;
      this.gainPulse.connect(this.gainA);

      this.buildSoundBuffers();
      this.accentTickBuffer = this.createAccentTickBuffer();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /* ================================================================
   *  Public API
   * ================================================================ */

  setOnBeat(cb: BeatCallback): void { this.onBeat = cb; }

  start(config: {
    masterBpm: number;
    beatsA: number; beatsB: number;
    soundA: ClickSound; soundB: ClickSound;
    accentsA: boolean[]; accentsB: boolean[];
    beatLevelsB?: number[];
  }): void {
    if (!this.ctx) return;
    this.masterBpm = config.masterBpm;
    this.beatsA = config.beatsA;
    this.beatsB = config.beatsB;
    this.soundA = config.soundA;
    this.soundB = config.soundB;
    this.accentsA = config.accentsA;
    this.accentsB = config.accentsB;
    this.beatLevelsB = config.beatLevelsB ?? Array(config.beatsB).fill(1);
    this.recalcGrid();

    const now = this.ctx.currentTime + 0.05;
    this.epoch = now;
    this.cellsFromEpoch = 0;

    this._isPlaying = true;
    this.scheduler();
  }

  stop(): void {
    this._isPlaying = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const osc of this.activePulseOscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activePulseOscs = [];
  }

  /** Live BPM change – scales remaining time proportionally. */
  setMasterBpm(newBpm: number): void {
    if (!this._isPlaying || !this.ctx) {
      this.masterBpm = newBpm;
      this.recalcGrid();
      return;
    }
    const now = this.ctx.currentTime;
    const oldDur = this.cellDuration;
    this.masterBpm = newBpm;
    this.recalcGrid();

    const nextTime = this.epoch + this.cellsFromEpoch * oldDur;
    const rem = nextTime - now;
    const scaled = rem > 0 ? rem * (this.cellDuration / oldDur) : 0;
    this.epoch = now + scaled - this.cellsFromEpoch * this.cellDuration;
  }

  /** Structural change (beat counts) – hard resync to cell 0. */
  setBeats(beatsA: number, beatsB: number, accentsA: boolean[], accentsB: boolean[]): void {
    this.beatsA = beatsA;
    this.beatsB = beatsB;
    this.accentsA = accentsA;
    this.accentsB = accentsB;
    this.beatLevelsB = Array(beatsB).fill(1);
    this.microAccents = [];
    this.recalcGrid();
    if (this._isPlaying && this.ctx) {
      const now = this.ctx.currentTime + 0.05;
      this.epoch = now;
      this.cellsFromEpoch = 0;
    }
  }

  setMicroAccents(accents: boolean[]): void {
    this.microAccents = accents;
  }

  updateTrack(track: MetronomeTrack): void {
    if (track.id === 1) { this.soundA = track.sound; this.accentsA = track.accents; }
    else if (track.id === 2) { this.soundB = track.sound; this.accentsB = track.accents; this.beatLevelsB = track.beatLevels; }
  }

  setVolume(ch: 'A' | 'B' | 'micro' | 'pulse', v: number): void {
    const val = Math.max(0, Math.min(1, v));
    if (ch === 'A')          { this._volA = val;     if (this.gainA) this.gainA.gain.value = val; }
    else if (ch === 'B')     { this._volB = val;     if (this.gainB) this.gainB.gain.value = val; }
    else if (ch === 'pulse') { this._volPulse = val; if (this.gainPulse) this.gainPulse.gain.value = val; }
    else                     { this._volMicro = val; if (this.gainMicro) this.gainMicro.gain.value = val; }
  }

  setPulseFreq(hz: number): void {
    this._pulseFreq = Math.max(50, Math.min(5000, hz));
  }

  get playing(): boolean { return this._isPlaying; }

  dispose(): void {
    this.stop();
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
  }

  /* ================================================================
   *  Scheduler – single grid walker
   * ================================================================ */

  private scheduler = (): void => {
    if (!this._isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;

    while (true) {
      const cellTime = this.epoch + this.cellsFromEpoch * this.cellDuration;
      if (cellTime >= now + SCHEDULE_AHEAD_TIME) break;

      const gridPos = this.cellsFromEpoch % this.gridSize;

      // ---- Track A ----
      if (gridPos % this.stepA === 0) {
        const beat = gridPos / this.stepA;
        const accent = this.accentsA[beat % this.accentsA.length];
        if (this._volA > 0) this.playSound(this.soundA, accent, this.gainA!, cellTime);
        this.fireBeat(1, beat, cellTime);
        if (this._volPulse > 0 && this._volA > 0) {
          const beatDuration = this.stepA * this.cellDuration;
          this.schedulePulse(cellTime, cellTime + beatDuration);
        }
      }

      // ---- Track B ----
      if (gridPos % this.stepB === 0) {
        const beat = gridPos / this.stepB;
        const accent = this.accentsB[beat % this.accentsB.length];
        const beatLevel = this.beatLevelsB[beat % this.beatLevelsB.length];
        if (this._volB > 0 && beatLevel > 0) {
          this.playSoundAtLevel(this.soundB, accent, this.gainB!, cellTime, beatLevel);
        }
        if (beatLevel > 0) this.fireBeat(2, beat, cellTime);
      }

      // ---- Micro-click (accented cells only) ----
      if (this._volMicro > 0 && this.microAccents[gridPos] === true && this.accentTickBuffer) {
        this.playBuffer(this.accentTickBuffer, this.gainMicro!, cellTime);
      }

      this.cellsFromEpoch++;
    }

    // Use global setTimeout (no window object in React Native)
    this.schedulerTimer = setTimeout(this.scheduler, SCHEDULER_INTERVAL);
  };

  /* ================================================================
   *  Helpers
   * ================================================================ */

  private recalcGrid(): void {
    this.gridSize = lcm(this.beatsA, this.beatsB);
    this.stepA = this.gridSize / this.beatsA;
    this.stepB = this.gridSize / this.beatsB;
    this.cellDuration = (this.beatsA * 60) / (this.masterBpm * this.gridSize);
  }

  private playSound(
    sound: ClickSound,
    accent: boolean,
    gain: ReturnType<AudioContext['createGain']>,
    time: number
  ): void {
    const bufs = this.soundBuffers.get(sound);
    const buf = bufs ? (accent ? bufs.accent : bufs.normal) : null;
    if (buf) this.playBuffer(buf, gain, time);
  }

  private playBuffer(
    buffer: ReturnType<AudioContext['createBuffer']>,
    gain: ReturnType<AudioContext['createGain']>,
    time: number
  ): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(time);
  }

  private playSoundAtLevel(
    sound: ClickSound,
    accent: boolean,
    gain: ReturnType<AudioContext['createGain']>,
    time: number,
    level: number
  ): void {
    const bufs = this.soundBuffers.get(sound);
    const buf = bufs ? (accent ? bufs.accent : bufs.normal) : null;
    if (!buf || !this.ctx) return;
    if (level >= 1) { this.playBuffer(buf, gain, time); return; }
    const tmpGain = this.ctx.createGain();
    tmpGain.gain.value = level;
    tmpGain.connect(gain);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(tmpGain);
    src.start(time);
    src.onEnded = () => { try { tmpGain.disconnect(); } catch { /* ok */ } };
  }

  private fireBeat(trackId: number, beatIndex: number, time: number): void {
    if (!this.onBeat || !this.ctx) return;
    const ms = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => this.onBeat!(beatIndex, time, trackId), ms);
  }

  private schedulePulse(startTime: number, endTime: number): void {
    if (!this.ctx || !this.gainPulse) return;
    const duration = endTime - startTime;
    if (duration <= 0.02) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = this._pulseFreq;

    const noteGain = this.ctx.createGain();
    const rampEnd = endTime - 0.003;

    noteGain.gain.setValueAtTime(0.001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.8, rampEnd);
    noteGain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(noteGain);
    noteGain.connect(this.gainPulse);

    osc.start(startTime);
    osc.stop(endTime + 0.01);

    this.activePulseOscs.push(osc);
    osc.onEnded = () => {
      const idx = this.activePulseOscs.indexOf(osc);
      if (idx !== -1) this.activePulseOscs.splice(idx, 1);
      try { noteGain.disconnect(); } catch { /* already disconnected */ }
    };
  }

  /* ================================================================
   *  Sound buffer synthesis
   * ================================================================ */

  private buildSoundBuffers(): void {
    this.soundBuffers.set('sine-low', {
      normal: this.createPiercingClick(880, 0.10, 0.7),
      accent: this.createPiercingClick(880, 0.12, 1.0),
    });
    this.soundBuffers.set('sine-mid', {
      normal: this.createPiercingClick(1760, 0.08, 0.7),
      accent: this.createPiercingClick(1760, 0.10, 1.0),
    });
    this.soundBuffers.set('sine-high', {
      normal: this.createPiercingClick(3200, 0.07, 0.7),
      accent: this.createPiercingClick(3200, 0.09, 1.0),
    });
  }

  private createPiercingClick(frequency: number, duration: number, volume: number): ReturnType<AudioContext['createBuffer']> {
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 35);
      const main = Math.sin(2 * Math.PI * frequency * t) * 0.55;
      const overtone = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.25;
      const noiseEnv = t < 0.003 ? 1.0 - (t / 0.003) : 0;
      const noise = (Math.random() * 2 - 1) * noiseEnv * 0.4;
      data[i] = (main + overtone + noise) * envelope * volume;
    }
    return buffer;
  }

  private createAccentTickBuffer(): ReturnType<AudioContext['createBuffer']> {
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    const duration = 0.012;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 80);
      data[i] = Math.sin(2 * Math.PI * 2000 * t) * envelope * 0.45;
    }
    return buffer;
  }
}

export const audioEngine = new AudioEngine();
