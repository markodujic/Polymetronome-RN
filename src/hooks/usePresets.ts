import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preset } from '../types/preset';

const STORAGE_KEY = '@polymetronome_presets_v1';

function makeDefault(
  label: string,
  bpm: number,
  beatsA: number,
  beatsB: number,
): Preset {
  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
  function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }

  return {
    label,
    bpm,
    beatsA,
    beatsB,
    beatLevels: Array(beatsB).fill(1) as number[],
    accentsA: Array.from({ length: beatsA }, (_, i) => i === 0),
    microAccents: Array(lcm(beatsA, beatsB)).fill(false) as boolean[],
    soundA: 'sine-high',
    soundB: 'sine-low',
    volumeA: 0.8,
    volumeB: 0.8,
  };
}

const DEFAULT_PRESETS: Preset[] = [
  makeDefault('4/4',  120, 4, 4),
  makeDefault('3/4',  120, 3, 3),
  makeDefault('6/8',  120, 6, 3),
  makeDefault('5/4',  100, 5, 4),
  makeDefault('3:2',  120, 3, 2),
  makeDefault('4:3',  120, 4, 3),
  makeDefault('5:3',  100, 5, 3),
  makeDefault('7:4',  100, 7, 4),
];

function autoLabel(beatsA: number, beatsB: number, bpm: number): string {
  return `${beatsA}:${beatsB} @ ${bpm}`;
}

export function usePresets(): [Preset[], (index: number, state: Omit<Preset, 'label'>) => Promise<void>] {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const presetsRef = useRef(presets);
  presetsRef.current = presets;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PRESETS.length) {
          setPresets(parsed as Preset[]);
        }
      } catch {
        // corrupt data → fall back to defaults silently
      }
    }).catch(() => {
      // storage unavailable (e.g. web without persistence) → keep defaults
    });
  }, []);

  const savePreset = useCallback(async (index: number, state: Omit<Preset, 'label'>) => {
    const label = autoLabel(state.beatsA, state.beatsB, state.bpm);
    const updated = presetsRef.current.map((p, i) =>
      i === index ? { ...state, label } as Preset : p
    );
    setPresets(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // best-effort — UI already updated
    }
  }, []);

  return [presets, savePreset];
}
