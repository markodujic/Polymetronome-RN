import type { ClickSound } from '../audio/AudioEngine';

export interface Preset {
  label: string;
  bpm: number;
  beatsA: number;
  beatsB: number;
  beatLevels: number[];   // Track B per-beat volume: 1.0 | 0.5 | 0.0
  accentsA: boolean[];    // Track A accent pattern
  microAccents: boolean[];
  soundA: ClickSound;
  soundB: ClickSound;
  volumeA: number;
  volumeB: number;
}
