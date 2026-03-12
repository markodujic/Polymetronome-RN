import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackStepPattern } from '../types/stepPattern';

export interface StepPreset {
  label: string;
  bpm: number;
  beatsA: number;
  beatsB: number;
  patternA: TrackStepPattern;
  patternB: TrackStepPattern;
}

const STORAGE_KEY = '@polymetronome_step_presets_v1';
const SLOT_COUNT = 8;

export function useStepPresets(): [
  (StepPreset | null)[],
  (index: number, preset: StepPreset) => Promise<void>,
] {
  const [stepPresets, setStepPresets] = useState<(StepPreset | null)[]>(
    () => Array(SLOT_COUNT).fill(null),
  );
  const presetsRef = useRef(stepPresets);
  presetsRef.current = stepPresets;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === SLOT_COUNT) {
          setStepPresets(parsed as (StepPreset | null)[]);
        }
      } catch {
        // corrupt data – keep empty slots
      }
    }).catch(() => {});
  }, []);

  const saveStepPreset = useCallback(async (index: number, preset: StepPreset) => {
    const updated = presetsRef.current.map((p, i) => (i === index ? preset : p));
    setStepPresets(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // best-effort
    }
  }, []);

  return [stepPresets, saveStepPreset];
}
