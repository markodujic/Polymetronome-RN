import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { audioEngine, type MetronomeTrack, type ClickSound } from '../audio/AudioEngine';
import type { Preset } from '../types/preset';

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }

function makeTrack(id: number, beats: number, bpm: number, sound: MetronomeTrack['sound']): MetronomeTrack {
  return {
    id,
    bpm,
    beats,
    subdivision: 1,
    accents: Array.from({ length: beats }, (_, i) => i === 0),
    beatLevels: Array(beats).fill(1) as number[],
    muted: false,
    volume: 0.8,
    sound,
  };
}

function derivedBpm(masterBpm: number, beatsA: number, beatsB: number): number {
  return (masterBpm * beatsB) / beatsA;
}

export function useMetronome() {
  const [bpm, setBpmState] = useState(120);
  const [trackA, setTrackA] = useState<MetronomeTrack>(() => makeTrack(1, 3, 120, 'sine-high'));
  const [trackB, setTrackB] = useState<MetronomeTrack>(() => makeTrack(2, 4, derivedBpm(120, 3, 4), 'sine-low'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeatA, setActiveBeatA] = useState<number | null>(null);
  const [activeBeatB, setActiveBeatB] = useState<number | null>(null);
  const [volumeA, setVolumeA] = useState(0.8);
  const [volumeB, setVolumeB] = useState(0.8);
  const [volumeMicro, setVolumeMicro] = useState(0.5);
  const [volumePulse, setVolumePulse] = useState(0.3);
  const [pulseFreq, setPulseFreqState] = useState(1600);
  const [microAccents, setMicroAccents] = useState<boolean[]>(
    () => Array(lcm(3, 4)).fill(false)
  );

  const bpmRef = useRef(bpm);
  const trackARef = useRef(trackA);
  const trackBRef = useRef(trackB);
  const microAccentsRef = useRef(microAccents);
  bpmRef.current = bpm;
  trackARef.current = trackA;
  trackBRef.current = trackB;
  microAccentsRef.current = microAccents;

  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    audioEngine.setOnBeat((beatIndex, _time, trackId) => {
      if (trackId === 1) setActiveBeatA(beatIndex);
      else if (trackId === 2) setActiveBeatB(beatIndex);
    });
    return () => { audioEngine.dispose(); };
  }, []);

  const sync = useCallback((masterBpm: number, a: MetronomeTrack, beatsB: number, accentsB: boolean[]) => {
    const beatsChanged = a.beats !== trackARef.current.beats || beatsB !== trackBRef.current.beats;
    const bpmChanged = masterBpm !== bpmRef.current;

    const newA = { ...a, bpm: masterBpm };
    const newB: MetronomeTrack = {
      ...trackBRef.current,
      beats: beatsB,
      accents: accentsB,
      bpm: derivedBpm(masterBpm, a.beats, beatsB),
      ...(beatsB !== trackBRef.current.beats
        ? { beatLevels: Array(beatsB).fill(1) as number[] }
        : {}),
    };
    setTrackA(newA);
    setTrackB(newB);

    if (audioEngine.playing) {
      if (beatsChanged) {
        audioEngine.setBeats(newA.beats, beatsB, newA.accents, accentsB);
      } else if (bpmChanged) {
        audioEngine.setMasterBpm(masterBpm);
      }
    }
    return { newA, newB };
  }, []);

  const applyBpm = useCallback((newBpm: number) => {
    const clamped = Math.max(20, Math.min(300, newBpm));
    setBpmState(clamped);
    if (audioEngine.playing) audioEngine.setMasterBpm(clamped);
  }, []);

  const setBeats = useCallback((trackId: 1 | 2, beats: number) => {
    const clamped = Math.max(1, Math.min(16, beats));
    let newBeatsA = trackARef.current.beats;
    let newBeatsB = trackBRef.current.beats;
    if (trackId === 1) {
      newBeatsA = clamped;
      const newAccentsA = Array.from({ length: clamped }, (_, i) => trackARef.current.accents[i] ?? (i === 0));
      const newA = { ...trackARef.current, beats: clamped, accents: newAccentsA };
      sync(bpmRef.current, newA, trackBRef.current.beats, trackBRef.current.accents);
    } else {
      newBeatsB = clamped;
      const newAccentsB = Array.from({ length: clamped }, (_, i) => trackBRef.current.accents[i] ?? (i === 0));
      sync(bpmRef.current, trackARef.current, clamped, newAccentsB);
    }
    const newGridSize = lcm(newBeatsA, newBeatsB);
    const resetAccents = Array(newGridSize).fill(false) as boolean[];
    setMicroAccents(resetAccents);
    audioEngine.setMicroAccents(resetAccents);
  }, [sync]);

  const toggleAccent = useCallback((trackId: 1 | 2, beatIndex: number) => {
    const ref = trackId === 1 ? trackARef : trackBRef;
    const setter = trackId === 1 ? setTrackA : setTrackB;
    const newAccents = [...ref.current.accents];
    newAccents[beatIndex] = !newAccents[beatIndex];
    const updated = { ...ref.current, accents: newAccents };
    setter(updated);
    if (audioEngine.playing) audioEngine.updateTrack(updated);
  }, []);

  const cycleBeatLevel = useCallback((beatIndex: number) => {
    const cur = trackBRef.current.beatLevels[beatIndex] ?? 1;
    const next = cur >= 1 ? 0.5 : cur >= 0.5 ? 0 : 1;
    const newLevels = [...trackBRef.current.beatLevels];
    newLevels[beatIndex] = next;
    const updated = { ...trackBRef.current, beatLevels: newLevels };
    setTrackB(updated);
    if (audioEngine.playing) audioEngine.updateTrack(updated);
  }, []);

  const play = useCallback(() => {
    audioEngine.init().then(() => {
      const a = trackARef.current;
      const b = trackBRef.current;
      audioEngine.start({
        masterBpm: bpmRef.current,
        beatsA: a.beats,
        beatsB: b.beats,
        soundA: a.sound,
        soundB: b.sound,
        accentsA: a.accents,
        accentsB: b.accents,
        beatLevelsB: b.beatLevels,
      });
      audioEngine.setMicroAccents(microAccentsRef.current);
      setIsPlaying(true);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Audio Error', msg);
      console.error('[AudioEngine] init failed:', err);
    });
  }, []);

  const stop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setActiveBeatA(null);
    setActiveBeatB(null);
  }, []);

  const toggle = useCallback(() => {
    if (audioEngine.playing) stop(); else play();
  }, [play, stop]);

  const tapTempo = useCallback(() => {
    const now = Date.now(); // React Native: use Date.now() instead of performance.now()
    if (
      tapTimesRef.current.length > 0 &&
      now - tapTimesRef.current[tapTimesRef.current.length - 1] > 2000
    ) {
      tapTimesRef.current = [];
    }
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current = tapTimesRef.current.slice(-8);
    }
    if (tapTimesRef.current.length >= 2) {
      const t = tapTimesRef.current;
      const intervals: number[] = [];
      for (let i = 1; i < t.length; i++) intervals.push(t[i] - t[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      applyBpm(Math.round(60000 / avg));
    }
  }, [applyBpm]);

  const toggleMicroAccent = useCallback((cellIndex: number) => {
    setMicroAccents((prev) => {
      const next = [...prev];
      next[cellIndex] = !next[cellIndex];
      audioEngine.setMicroAccents(next);
      return next;
    });
  }, []);

  const setSound = useCallback((trackId: 1 | 2, sound: ClickSound) => {
    const ref = trackId === 1 ? trackARef : trackBRef;
    const setter = trackId === 1 ? setTrackA : setTrackB;
    const updated = { ...ref.current, sound };
    setter(updated);
    if (audioEngine.playing) audioEngine.updateTrack(updated);
  }, []);

  const setPulseFreq = useCallback((hz: number) => {
    setPulseFreqState(hz);
    audioEngine.setPulseFreq(hz);
  }, []);

  const loadPreset = useCallback((preset: Omit<Preset, 'label'>) => {
    const clampedBpm = Math.max(20, Math.min(300, preset.bpm));
    const clampedBeatsA = Math.max(1, Math.min(16, preset.beatsA));
    const clampedBeatsB = Math.max(1, Math.min(16, preset.beatsB));

    const newA: MetronomeTrack = {
      ...trackARef.current,
      beats: clampedBeatsA,
      accents: Array.from({ length: clampedBeatsA }, (_, i) => preset.accentsA[i] ?? (i === 0)),
      sound: preset.soundA,
      volume: preset.volumeA,
      bpm: clampedBpm,
    };
    const newB: MetronomeTrack = {
      ...trackBRef.current,
      beats: clampedBeatsB,
      beatLevels: Array.from({ length: clampedBeatsB }, (_, i) => preset.beatLevels[i] ?? 1),
      sound: preset.soundB,
      volume: preset.volumeB,
      bpm: (clampedBpm * clampedBeatsB) / clampedBeatsA,
    };
    const newGrid = lcm(clampedBeatsA, clampedBeatsB);
    const safeMicro = Array.from({ length: newGrid }, (_, i) => preset.microAccents[i] ?? false);

    setTrackA(newA);
    setTrackB(newB);
    setBpmState(clampedBpm);
    setVolumeA(preset.volumeA);
    setVolumeB(preset.volumeB);
    setMicroAccents(safeMicro);
    audioEngine.setVolume('A', preset.volumeA);
    audioEngine.setVolume('B', preset.volumeB);

    if (audioEngine.playing) {
      audioEngine.setBeats(clampedBeatsA, clampedBeatsB, newA.accents, newB.accents);
      audioEngine.setMasterBpm(clampedBpm);
      audioEngine.updateTrack(newA);
      audioEngine.updateTrack(newB);
      audioEngine.setMicroAccents(safeMicro);
    }
  }, []);

  const changeVolume = useCallback((channel: 'A' | 'B' | 'micro' | 'pulse', value: number) => {
    audioEngine.setVolume(channel, value);
    switch (channel) {
      case 'A': setVolumeA(value); break;
      case 'B': setVolumeB(value); break;
      case 'micro': setVolumeMicro(value); break;
      case 'pulse': setVolumePulse(value); break;
    }
  }, []);

  return {
    bpm,
    trackA,
    trackB,
    isPlaying,
    activeBeatA,
    activeBeatB,
    volumeA,
    volumeB,
    volumeMicro,
    volumePulse,
    microAccents,
    toggle,
    applyBpm,
    setBeats,
    toggleAccent,
    cycleBeatLevel,
    tapTempo,
    changeVolume,
    toggleMicroAccent,
    setSound,
    pulseFreq,
    setPulseFreq,
    loadPreset,
  };
}
