import './global.css';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions, Pressable, Platform, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { GlowSlider } from './src/components/GlowSlider';
import { useMetronome } from './src/hooks/useMetronome';
import { usePresets } from './src/hooks/usePresets';
import { RhythmTrack } from './src/components/RhythmTrack';
import { PolyCanvas } from './src/components/PolyCanvas';
import { CircleViz } from './src/components/CircleViz';
import { KaraokeBar } from './src/components/KaraokeBar';
import { SettingsSheet } from './src/components/SettingsSheet';
import { StepView } from './src/components/StepView';
import type { StepViewHandle } from './src/components/StepView';
import { makeDefaultPattern, flattenPattern, subdivideNode, collapseNode, updateNode } from './src/types/stepPattern';
import type { TrackStepPattern, StepNode } from './src/types/stepPattern';
import { useStepPresets } from './src/hooks/useStepPresets';
import type { StepPreset } from './src/hooks/useStepPresets';
import { audioEngine } from './src/audio/AudioEngine';
import type { ClickSound } from './src/audio/AudioEngine';

function PresetMiniGrid({ beatsA, beatsB, accentsA, accentsB, slotNum }: {
  beatsA: number; beatsB: number;
  accentsA: boolean[]; accentsB: boolean[];
  slotNum: number;
}) {
  const DOT = 5;
  return (
    <View style={pgStyles.wrapper}>
      <View style={pgStyles.header}>
        <Text style={pgStyles.ratio}>{beatsA}:{beatsB}</Text>
        <Text style={pgStyles.slotNum}>{slotNum}</Text>
      </View>
      {/* Track A — dots positioned proportionally along the timeline */}
      <View style={pgStyles.timeline}>
        {Array.from({ length: beatsA }, (_, i) => (
          <View
            key={i}
            style={[
              pgStyles.dot,
              { left: `${(i / beatsA) * 100}%`, backgroundColor: (accentsA[i] ?? false) ? '#ff6b35' : 'rgba(255,107,53,0.55)' },
            ]}
          />
        ))}
      </View>
      {/* Track B — same timeline width, different spacing = visible polyrhythm */}
      <View style={pgStyles.timeline}>
        {Array.from({ length: beatsB }, (_, i) => (
          <View
            key={i}
            style={[
              pgStyles.dot,
              { left: `${(i / beatsB) * 100}%`, backgroundColor: (accentsB[i] ?? false) ? '#e8aa14' : 'rgba(232,170,20,0.55)' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const pgStyles = StyleSheet.create({
  wrapper: { width: '100%', paddingHorizontal: 5, paddingVertical: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ratio: { color: '#e8eaf0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  slotNum: { color: '#5a6080', fontSize: 10, fontWeight: '700' },
  timeline: { position: 'relative', width: '100%', height: 7, marginBottom: 3 },
  dot: { position: 'absolute', top: 0, width: 5, height: 5, borderRadius: 2 },
  emptyRatio: { color: '#3a4060', fontSize: 13, fontWeight: '700' },
});

function StepMiniGrid({ patternA, patternB, beatsA, beatsB, slotNum }: {
  patternA: TrackStepPattern; patternB: TrackStepPattern;
  beatsA: number; beatsB: number; slotNum: number;
}) {
  const posA: number[] = [];
  flattenPattern(patternA).forEach((offsets, beatIdx) => {
    offsets.forEach(o => posA.push(((beatIdx + o) / beatsA) * 100));
  });
  const posB: number[] = [];
  flattenPattern(patternB).forEach((offsets, beatIdx) => {
    offsets.forEach(o => posB.push(((beatIdx + o) / beatsB) * 100));
  });
  return (
    <View style={pgStyles.wrapper}>
      <View style={pgStyles.header}>
        <Text style={pgStyles.ratio}>{beatsA}:{beatsB}</Text>
        <Text style={pgStyles.slotNum}>{slotNum}</Text>
      </View>
      <View style={pgStyles.timeline}>
        {posA.map((pos, i) => (
          <View key={i} style={[pgStyles.dot, { left: `${pos}%` as any, backgroundColor: '#ff6b35' }]} />
        ))}
      </View>
      <View style={pgStyles.timeline}>
        {posB.map((pos, i) => (
          <View key={i} style={[pgStyles.dot, { left: `${pos}%` as any, backgroundColor: '#e8aa14' }]} />
        ))}
      </View>
    </View>
  );
}

function StepMiniEmpty({ slotNum }: { slotNum: number }) {
  return (
    <View style={pgStyles.wrapper}>
      <View style={pgStyles.header}>
        <Text style={pgStyles.emptyRatio}>—</Text>
        <Text style={pgStyles.slotNum}>{slotNum}</Text>
      </View>
      <View style={pgStyles.timeline} />
      <View style={pgStyles.timeline} />
    </View>
  );
}

export default function App() {
  const {
    bpm, trackA, trackB,
    isPlaying, activeBeatA, activeBeatB,
    volumeA, volumeB, volumeMicro, volumePulse,
    microAccents, toggle, applyBpm,
    setBeats, cycleBeatLevel, changeVolume,
    toggleMicroAccent, toggleAccent, setSound, pulseFreq, setPulseFreq,
    loadPreset,
  } = useMetronome();

  const [presets, savePreset] = usePresets();
  const [stepPresets, saveStepPreset] = useStepPresets();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Responsive scale: 1.0 at 780px+, shrinks on smaller screens
  const scale = Math.min(1, height / 780);
  const compact = scale < 0.85;
  const playBtnSize = Math.max(48, Math.round(68 * scale));

  const [focusedTrack, setFocusedTrack] = useState<'A' | 'B'>('A');
  const [viewMode, setViewMode] = useState<'polygrid' | 'circle' | 'step'>('polygrid');
  const [stepPatternA, setStepPatternA] = useState<TrackStepPattern>(() => makeDefaultPattern(trackA.beats));
  const [stepPatternB, setStepPatternB] = useState<TrackStepPattern>(() => makeDefaultPattern(trackB.beats));
  const [karaokeOn, setKaraokeOn] = useState(true);
  const [karaokeTrack, setKaraokeTrack] = useState<'a' | 'b' | 'ab'>('ab');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customPhrases, setCustomPhrases] = useState<Record<number, string>>({});
  const [isSaveMode, setIsSaveMode] = useState(false);
  const [savedSlotIdx, setSavedSlotIdx] = useState<number | null>(null);
  const savedGlowAnim = useRef(new Animated.Value(0)).current;
  const stepViewRef = useRef<StepViewHandle>(null);
  const [dragState, setDragState] = useState<{ tool: string; gx: number; gy: number } | null>(null);

  const handleCustomPhrase = useCallback((sylCount: number, text: string) => {
    setCustomPhrases(prev => ({ ...prev, [sylCount]: text }));
  }, []);

  const handleSaveToSlot = useCallback((i: number) => {
    if (viewMode === 'step') {
      const label = `${trackA.beats}:${trackB.beats} @ ${bpm}`;
      saveStepPreset(i, {
        label,
        bpm,
        beatsA: trackA.beats,
        beatsB: trackB.beats,
        patternA: stepPatternA,
        patternB: stepPatternB,
      });
    } else {
      savePreset(i, {
        bpm,
        beatsA: trackA.beats,
        beatsB: trackB.beats,
        beatLevels: trackB.beatLevels,
        accentsA: trackA.accents,
        accentsB: trackB.accents,
        microAccents,
        soundA: trackA.sound,
        soundB: trackB.sound,
        volumeA,
        volumeB,
        karaokeTrack,
      });
    }
    setIsSaveMode(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setSavedSlotIdx(i);
    savedGlowAnim.setValue(1);
    Animated.timing(savedGlowAnim, {
      toValue: 0,
      duration: 900,
      useNativeDriver: false,
    }).start(() => setSavedSlotIdx(null));
  }, [bpm, trackA, trackB, microAccents, volumeA, volumeB, savePreset, saveStepPreset, savedGlowAnim, viewMode, stepPatternA, stepPatternB, karaokeTrack]);

  // Mute toggle refs
  const prevVolARef = useRef(0.8);
  const prevVolBRef = useRef(0.8);
  const prevVolMicroRef = useRef(0.5);
  const prevVolPulseRef = useRef(0.3);

  const muteA = useCallback(() => {
    if (volumeA > 0) { prevVolARef.current = volumeA; changeVolume('A', 0); }
    else changeVolume('A', prevVolARef.current || 0.8);
  }, [volumeA, changeVolume]);

  const muteB = useCallback(() => {
    if (volumeB > 0) { prevVolBRef.current = volumeB; changeVolume('B', 0); }
    else changeVolume('B', prevVolBRef.current || 0.8);
  }, [volumeB, changeVolume]);

  const muteMicro = useCallback(() => {
    if (volumeMicro > 0) { prevVolMicroRef.current = volumeMicro; changeVolume('micro', 0); }
    else changeVolume('micro', prevVolMicroRef.current || 0.5);
  }, [volumeMicro, changeVolume]);

  const mutePulse = useCallback(() => {
    if (volumePulse > 0) { prevVolPulseRef.current = volumePulse; changeVolume('pulse', 0); }
    else changeVolume('pulse', prevVolPulseRef.current || 0.3);
  }, [volumePulse, changeVolume]);

  const handleToggle = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* no haptics on this platform */ }
    toggle();
  }, [toggle]);

  const setBeatsA = useCallback((b: number) => setBeats(1, b), [setBeats]);
  const setBeatsB = useCallback((b: number) => setBeats(2, b), [setBeats]);
  const setVolA = useCallback((v: number) => changeVolume('A', v), [changeVolume]);
  const setVolB = useCallback((v: number) => changeVolume('B', v), [changeVolume]);
  const setSoundA = useCallback((s: ClickSound) => setSound(1, s), [setSound]);
  const setSoundB = useCallback((s: ClickSound) => setSound(2, s), [setSound]);

  // When beat count changes, rebuild the step pattern (reset to all-active leaves).
  useEffect(() => {
    setStepPatternA(makeDefaultPattern(trackA.beats));
  }, [trackA.beats]);
  useEffect(() => {
    setStepPatternB(makeDefaultPattern(trackB.beats));
  }, [trackB.beats]);

  // Sync step events to AudioEngine whenever step mode is active or patterns change.
  useEffect(() => {
    if (viewMode === 'step') {
      audioEngine.setStepEvents(1, flattenPattern(stepPatternA));
      audioEngine.setStepEvents(2, flattenPattern(stepPatternB));
    } else {
      audioEngine.setStepEvents(1, null);
      audioEngine.setStepEvents(2, null);
    }
  }, [viewMode, stepPatternA, stepPatternB]);

  const beatIntervalSec = 60 / bpm;
  const pulseActive = isPlaying && volumePulse > 0 && volumeA > 0;
  const karaokeBarH = (viewMode === 'polygrid' && karaokeOn)
    ? Math.max(36, Math.round(64 * scale)) : 0;

  // ── Drag-and-Drop ────────────────────────────────────────────────────────────────
  // applyDragTool in Ref halten, damit PanResponder-Closures immer aktuelle Version lesen
  const applyDragToolRef = useRef<(tool: string, trackId: 1 | 2, path: number[]) => void>(null!);
  applyDragToolRef.current = (tool, trackId, path) => {
    // path zeigt genau auf das getroffene Blatt – direkt anwenden, kein applyToLeaves nötig
    const depth = path.length - 1;
    const applyLeaf = (n: StepNode): StepNode => {
      if (n.subdivision !== null || depth >= 3) return n;
      if (tool === '÷3') return subdivideNode(n, 3);
      if (tool === '÷3 –') {
        const sub = subdivideNode(n, 3);
        return { ...sub, children: sub.children.map((c, i) => i === 1 ? { ...c, active: false } : c) };
      }
      if (tool === '×4') {
        const half = subdivideNode(n, 2);
        return { ...half, children: half.children.map(c => depth < 2 ? subdivideNode(c, 2) : c) };
      }
      return n;
    };
    if (trackId === 1) {
      setStepPatternA(prev => ({ nodes: updateNode(prev.nodes, path, applyLeaf) }));
    } else {
      setStepPatternB(prev => ({ nodes: updateNode(prev.nodes, path, applyLeaf) }));
    }
  };

  const dragLabels = ['÷3', '÷3 –', '×4', 'Btn 4', 'Btn 5'] as const;
  const dragResponders = useMemo(
    () =>
      dragLabels.map(tool =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderGrant: e => {
            setDragState({ tool, gx: e.nativeEvent.pageX, gy: e.nativeEvent.pageY });
          },
          onPanResponderMove: e => {
            setDragState(d => d ? { ...d, gx: e.nativeEvent.pageX, gy: e.nativeEvent.pageY } : null);
          },
          onPanResponderRelease: e => {
            const hit = stepViewRef.current?.hitTest(e.nativeEvent.pageX, e.nativeEvent.pageY);
            if (hit) applyDragToolRef.current(tool, hit.trackId, hit.path);
            setDragState(null);
          },
          onPanResponderTerminate: () => setDragState(null),
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const controlsSection = (
    <>
      {/* Header row: BPM | Logo */}
      <View style={[styles.headerRow, scale < 1 && { paddingTop: Math.max(4, Math.round(12 * scale)), paddingBottom: Math.max(2, Math.round(4 * scale)) }]}>
        <View style={styles.bpmDisplay}>
          <Text style={[styles.bpmValue, scale < 1 && { fontSize: Math.max(28, Math.round(44 * scale)) }]}>{bpm}</Text>
          <Text style={styles.bpmUnit}>BPM</Text>
        </View>
        <Text style={styles.appTitle}>
          <Text style={styles.titlePoly}>Poly</Text>
          <Text style={styles.titleMetro}>metronome</Text>
        </Text>
      </View>

      {/* BPM Slider row */}
      <View style={styles.bpmControls}>
        <TouchableOpacity
          style={[styles.bpmStepBtn, scale < 1 && { width: Math.max(28, Math.round(36 * scale)), height: Math.max(28, Math.round(36 * scale)) }]}
          onPress={() => applyBpm(bpm - 1)}
        >
          <Text style={styles.stepTxt}>−</Text>
        </TouchableOpacity>
        <GlowSlider
          wrapperStyle={styles.bpmSlider}
          sliderHeight={Math.max(28, Math.round(40 * scale))}
          minimumValue={20}
          maximumValue={300}
          value={bpm}
          step={1}
          onValueChange={applyBpm}
          minimumTrackTintColor="#ff6b35"
          maximumTrackTintColor="#2a3a4a"
        />
        <TouchableOpacity
          style={[styles.bpmStepBtn, scale < 1 && { width: Math.max(28, Math.round(36 * scale)), height: Math.max(28, Math.round(36 * scale)) }]}
          onPress={() => applyBpm(bpm + 1)}
        >
          <Text style={styles.stepTxt}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Preset canvas */}
      <View style={styles.presetRow}>
        <View style={[styles.presetCanvas, scale < 1 && { paddingVertical: Math.max(4, Math.round(8 * scale)) }]}>
          {viewMode === 'step' ? stepPresets.map((sp, i) => (
            <Animated.View
              key={i}
              style={[
                styles.presetBtnWrapper,
                savedSlotIdx === i && Platform.OS !== 'web' && {
                  shadowColor: '#f0c040',
                  shadowOpacity: savedGlowAnim,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: savedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.presetBtn,
                  isSaveMode && styles.presetBtnSaveMode,
                  pressed && styles.presetBtnPressed,
                ]}
                onPress={() => {
                  if (isSaveMode) {
                    handleSaveToSlot(i);
                  } else if (sp) {
                    applyBpm(sp.bpm);
                    setBeats(1, sp.beatsA);
                    setBeats(2, sp.beatsB);
                    setStepPatternA(sp.patternA);
                    setStepPatternB(sp.patternB);
                  }
                }}
                accessibilityLabel={isSaveMode ? `In Slot ${i + 1} speichern` : (sp ? sp.label : `Leerer Slot ${i + 1}`)}
              >
                {sp ? (
                  <StepMiniGrid
                    patternA={sp.patternA}
                    patternB={sp.patternB}
                    beatsA={sp.beatsA}
                    beatsB={sp.beatsB}
                    slotNum={i + 1}
                  />
                ) : (
                  <StepMiniEmpty slotNum={i + 1} />
                )}
              </Pressable>
            </Animated.View>
          )) : presets.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                styles.presetBtnWrapper,
                savedSlotIdx === i && Platform.OS !== 'web' && {
                  shadowColor: '#f0c040',
                  shadowOpacity: savedGlowAnim,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: savedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.presetBtn,
                  isSaveMode && styles.presetBtnSaveMode,
                  pressed && styles.presetBtnPressed,
                ]}
                onPress={() => {
                  if (isSaveMode) {
                    handleSaveToSlot(i);
                  } else {
                    loadPreset(p);
                    setKaraokeTrack(p.karaokeTrack ?? 'ab');
                  }
                }}
                accessibilityLabel={isSaveMode ? `In Slot ${i + 1} speichern` : p.label}
              >
                <PresetMiniGrid
                  beatsA={p.beatsA}
                  beatsB={p.beatsB}
                  accentsA={p.accentsA ?? []}
                  accentsB={p.accentsB ?? []}
                  slotNum={i + 1}
                />
              </Pressable>
            </Animated.View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.presetSaveToggle,
            isSaveMode && styles.presetSaveToggleActive,
            pressed && styles.presetBtnPressed,
          ]}
          onPress={() => setIsSaveMode(v => !v)}
          accessibilityLabel={isSaveMode ? 'Speichern abbrechen' : 'Preset speichern'}
        >
          <Text style={styles.presetSaveToggleIcon}>{isSaveMode ? '✕' : '✎'}</Text>
        </Pressable>
      </View>

      {/* Tracks */}
      <RhythmTrack label="A" track={trackA} isMaster isSelected={focusedTrack === 'A'}
        volume={volumeA} onSelect={() => setFocusedTrack('A')}
        onBeats={setBeatsA} onVolume={setVolA} onMute={muteA} compact={compact} />
      <RhythmTrack label="B" track={trackB} isMaster={false} isSelected={focusedTrack === 'B'}
        volume={volumeB} onSelect={() => setFocusedTrack('B')}
        onBeats={setBeatsB} onVolume={setVolB} onMute={muteB} compact={compact} />

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'polygrid' && styles.viewBtnActive, scale < 1 && { paddingVertical: Math.max(4, Math.round(10 * scale)) }]}
          onPress={() => setViewMode('polygrid')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'polygrid' && styles.viewBtnTxtActive]}>
            Grid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'circle' && styles.viewBtnActive, scale < 1 && { paddingVertical: Math.max(4, Math.round(10 * scale)) }]}
          onPress={() => setViewMode('circle')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'circle' && styles.viewBtnTxtActive]}>
            Circle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'step' && styles.viewBtnActive, scale < 1 && { paddingVertical: Math.max(4, Math.round(10 * scale)) }]}
          onPress={() => setViewMode('step')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'step' && styles.viewBtnTxtActive]}>
            Step
          </Text>
        </TouchableOpacity>
      </View>

      {/* Micro / Pulse / Frequency sliders – single horizontal row */}
      {viewMode === 'step' ? (
        <View style={styles.stepToolBar}>
          {dragLabels.map((label, i) => (
            <View key={label} style={styles.stepToolBtn} {...dragResponders[i].panHandlers}>
              <Text style={styles.stepToolBtnTxt} selectable={false}>{label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.sliderGroup, scale < 1 && { paddingVertical: Math.max(2, Math.round(6 * scale)) }]}>
          <CompactSlider
            label="MICRO"
            muted={volumeMicro === 0}
            onMute={muteMicro}
            value={volumeMicro}
            onValueChange={(v) => changeVolume('micro', v)}
            sliderHeight={Math.max(22, Math.round(32 * scale))}
          />
          <CompactSlider
            label="PULSE"
            muted={volumePulse === 0}
            onMute={mutePulse}
            value={volumePulse}
            onValueChange={(v) => changeVolume('pulse', v)}
            sliderHeight={Math.max(22, Math.round(32 * scale))}
          />
          <CompactSlider
            label={`${pulseFreq} HZ`}
            muted={false}
            onMute={() => {}}
            value={pulseFreq / 5000}
            onValueChange={(v) => setPulseFreq(Math.round(v * 5000 / 10) * 10 || 50)}
            sliderHeight={Math.max(22, Math.round(32 * scale))}
          />
        </View>
      )}
    </>
  );

  const canvasSection = (
    <View style={[styles.canvasArea, isLandscape && styles.canvasAreaLandscape]}>
      {viewMode === 'polygrid' ? (
        <PolyCanvas
          trackA={trackA} trackB={trackB}
          activeBeatA={activeBeatA} activeBeatB={activeBeatB}
          isPlaying={isPlaying} focusedTrack={focusedTrack}
          microAccents={microAccents}
          onMicroAccentToggle={toggleMicroAccent}
          onBeatBClick={cycleBeatLevel}
          onBeatAAccentClick={(i) => toggleAccent(1, i)}
          pulseActive={pulseActive}
          beatIntervalSec={beatIntervalSec}
        />
      ) : viewMode === 'circle' ? (
        <CircleViz
          trackA={trackA} trackB={trackB}
          activeBeatA={activeBeatA} activeBeatB={activeBeatB}
          isPlaying={isPlaying} beatIntervalSec={beatIntervalSec}
          microAccents={microAccents}
          karaokeOn={karaokeOn}
          customPhrases={customPhrases}
          karaokeTrack={karaokeTrack}
          onKaraokeTrack={setKaraokeTrack}
        />
      ) : (
        <StepView
          ref={stepViewRef}
          patternA={stepPatternA}
          patternB={stepPatternB}
          onPatternA={setStepPatternA}
          onPatternB={setStepPatternB}
          activeBeatA={activeBeatA}
          activeBeatB={activeBeatB}
          isPlaying={isPlaying}
          beatsA={trackA.beats}
          beatsB={trackB.beats}
          onReset={() => {
            setStepPatternA(makeDefaultPattern(trackA.beats));
            setStepPatternB(makeDefaultPattern(trackB.beats));
          }}
        />
      )}
    </View>
  );

  const playButton = (
    <View style={[styles.playBtnBar, scale < 1 && { paddingVertical: Math.max(6, Math.round(12 * scale)) }]}>
      <TouchableOpacity
        style={styles.karaokeToggleBtn}
        onPress={() => setKaraokeOn(v => !v)}
        accessibilityLabel={karaokeOn ? 'Karaoke ausblenden' : 'Karaoke einblenden'}
      >
        <Text style={[styles.karaokeToggleIcon, karaokeOn && styles.karaokeToggleIconOn]}>💬</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.playBtn,
          isPlaying && styles.playBtnActive,
          isLandscape && styles.playBtnLandscape,
          !isLandscape && scale < 1 && { width: playBtnSize, height: playBtnSize, borderRadius: playBtnSize / 2 },
        ]}
        onPress={handleToggle}
        accessibilityLabel={isPlaying ? 'Stop' : 'Play'}
        accessibilityRole="button"
      >
        <Text style={styles.playBtnIcon}>{isPlaying ? '⏹' : '▶'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => setSettingsVisible(true)}
        accessibilityLabel="Einstellungen"
      >
        <Text style={styles.settingsBtnIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <SafeAreaProvider>
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {isLandscape ? (
        // Landscape: two-column layout
        <View style={styles.landscapeRow}>
          <ScrollView style={styles.leftCol} contentContainerStyle={styles.leftColContent}>
            {controlsSection}
            {playButton}
          </ScrollView>
          <View style={styles.rightCol}>
            {canvasSection}
          </View>
        </View>
      ) : (
        // Portrait: no-scroll, canvas takes remaining space, karaoke bar separate
        <View style={styles.portraitContainer}>
          {controlsSection}
          <View style={styles.canvasWrapper}>
            {canvasSection}
          </View>
          <View style={{ height: karaokeBarH, overflow: 'hidden' }}>
            <KaraokeBar
              trackA={trackA} trackB={trackB}
              activeBeatA={activeBeatA} activeBeatB={activeBeatB}
              isPlaying={isPlaying} karaokeOn={karaokeOn}
              karaokeTrack={karaokeTrack}
              onKaraokeTrack={setKaraokeTrack}
              customPhrases={customPhrases}
            />
          </View>
          {playButton}
        </View>
      )}
      {dragState != null && (
        <View
          pointerEvents="none"
          style={[styles.dragGhost, { left: dragState.gx - 30, top: dragState.gy - 22 }]}
        >
          <Text style={styles.dragGhostTxt}>{dragState.tool}</Text>
        </View>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
    <SettingsSheet
      visible={settingsVisible}
      onClose={() => setSettingsVisible(false)}
      soundA={trackA.sound}
      soundB={trackB.sound}
      onSoundA={setSoundA}
      onSoundB={setSoundB}
      karaokeOn={karaokeOn}
      onToggleKaraoke={() => setKaraokeOn(v => !v)}
      karaokeTrack={karaokeTrack}
      onKaraokeTrack={setKaraokeTrack}
      customPhrases={customPhrases}
      onCustomPhrase={handleCustomPhrase}
    />
    </>
  );
}

// Compact horizontal slider (label on top, slider below)
function CompactSlider({
  label, muted, onMute, value, onValueChange, sliderHeight = 32,
}: {
  label: string;
  muted: boolean;
  onMute: () => void;
  value: number;
  onValueChange: (v: number) => void;
  sliderHeight?: number;
}) {
  return (
    <View style={styles.compactSliderCol}>
      <TouchableOpacity onPress={onMute}>
        <Text style={[styles.compactSliderLabel, muted && styles.sliderLabelMuted]}>
          {label}
        </Text>
      </TouchableOpacity>
      <GlowSlider
        sliderHeight={sliderHeight}
        muted={muted}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={muted ? '#2a3a4a' : '#ff6b35'}
        maximumTrackTintColor="#2a3a4a"
      />
    </View>
  );
}

const BG = '#0f0f0f';
const BG2 = '#1a1a2e';
const BG3 = '#16213e';
const ACCENT = '#ff6b35';
const ACCENT_B = '#e8aa14';
const BORDER = '#2a2a4a';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  // Portrait layout
  portraitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  portraitScroll: {
    flexShrink: 1,
    flexGrow: 0,
  },
  portraitContent: {
    paddingBottom: 0,
  },
  canvasWrapper: {
    flex: 1,
  },
  // Landscape layout
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftCol: {
    width: '42%',
    backgroundColor: BG,
  },
  leftColContent: {
    paddingBottom: 16,
  },
  rightCol: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
  },
  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnTxt: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: BG3,
  },
  settingsBtnIcon: {
    fontSize: 18,
  },
  appTitle: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  titlePoly: {
    color: ACCENT,
    fontWeight: '700',
  },
  titleMetro: {
    color: '#e0e0e0',
    fontWeight: '300',
  },
  bpmDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bpmValue: {
    color: ACCENT,
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bpmUnit: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '400',
  },
  bpmControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  bpmStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmSlider: {
    flex: 1,
    height: 40,
  },
  stepTxt: {
    color: '#e0e0e0',
    fontSize: 20,
  },
  // Preset canvas
  presetRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG2,
  },
  presetCanvas: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  presetBtnWrapper: {
    width: '23%',
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 5,
    marginBottom: 5,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  presetBtnSaveMode: {
    borderColor: '#f0c040',
    ...Platform.select({
      native: {
        shadowColor: '#f0c040',
        shadowOpacity: 0.9,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      web: { boxShadow: '0 0 10px rgba(240,192,64,0.9)' },
    }),
    elevation: 10,
  },
  presetBtnPressed: {
    backgroundColor: '#2a3050',
    borderColor: ACCENT,
  },
  presetLabel: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  presetSub: {
    color: '#5a6080',
    fontSize: 10,
    marginTop: 1,
  },
  presetSaveToggle: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG3,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  presetSaveToggleActive: {
    backgroundColor: '#2a2000',
    borderLeftColor: '#c8a000',
  },
  presetSaveToggleIcon: {
    color: '#c8a000',
    fontSize: 18,
  },
  // View toggle
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginVertical: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: BG2,
  },
  viewBtnActive: {
    backgroundColor: BG3,
  },
  viewBtnTxt: {
    color: '#5a6080',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  viewBtnTxtActive: {
    color: ACCENT,
  },
  // Slider group – horizontal row
  sliderGroup: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    backgroundColor: BG2,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  stepToolBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: BG2,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  stepToolBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2e',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { userSelect: 'none', cursor: 'grab' } as any : {}),
  },
  stepToolBtnTxt: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  dragGhost: {
    position: 'absolute',
    zIndex: 9999,
    width: 60,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#ff6b35cc',
    alignItems: 'center',
  },
  dragGhostTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  compactSliderCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  compactSliderLabel: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  compactSlider: {
    height: 32,
    width: '100%',
  },
  sliderLabelMuted: {
    color: '#5a6080',
    textDecorationLine: 'line-through',
  },
  // Canvas area
  canvasArea: {
    flex: 1,
    width: '100%',
  },
  canvasAreaLandscape: {
    flex: 1,
  },
  // Play button bar
  playBtnBar: {
    backgroundColor: BG2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  karaokeToggleBtn: {
    position: 'absolute',
    left: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: BG3,
  },
  karaokeToggleIcon: {
    fontSize: 18,
    opacity: 0.4,
  },
  karaokeToggleIconOn: {
    opacity: 1,
  },
  // Play button
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      native: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      web: {
        boxShadow: `0 0 12px ${ACCENT}80`,
      },
    }),
    elevation: 8,
  },
  playBtnActive: {
    backgroundColor: '#7dd3fc',
    ...Platform.select({
      native: { shadowColor: '#7dd3fc' },
      web: { boxShadow: '0 0 12px #7dd3fc80' },
    }),
  },
  playBtnLandscape: {
    width: '80%',
    height: 48,
    borderRadius: 24,
  },
  playBtnIcon: {
    color: '#fff',
    fontSize: 26,
  },
});;
