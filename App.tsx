import './global.css';
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions, Pressable, Platform, Animated,
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
});

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

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Responsive scale: 1.0 at 780px+, shrinks on smaller screens
  const scale = Math.min(1, height / 780);
  const compact = scale < 0.85;
  const playBtnSize = Math.max(48, Math.round(68 * scale));

  const [focusedTrack, setFocusedTrack] = useState<'A' | 'B'>('A');
  const [viewMode, setViewMode] = useState<'raster' | 'circle'>('raster');
  const [karaokeOn, setKaraokeOn] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customPhrases, setCustomPhrases] = useState<Record<number, string>>({});
  const [isSaveMode, setIsSaveMode] = useState(false);
  const [savedSlotIdx, setSavedSlotIdx] = useState<number | null>(null);
  const savedGlowAnim = useRef(new Animated.Value(0)).current;

  const handleCustomPhrase = useCallback((sylCount: number, text: string) => {
    setCustomPhrases(prev => ({ ...prev, [sylCount]: text }));
  }, []);

  const handleSaveToSlot = useCallback((i: number) => {
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
    });
    setIsSaveMode(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setSavedSlotIdx(i);
    savedGlowAnim.setValue(1);
    Animated.timing(savedGlowAnim, {
      toValue: 0,
      duration: 900,
      useNativeDriver: false,
    }).start(() => setSavedSlotIdx(null));
  }, [bpm, trackA, trackB, microAccents, volumeA, volumeB, savePreset, savedGlowAnim]);

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

  const beatIntervalSec = 60 / bpm;
  const pulseActive = isPlaying && volumePulse > 0 && volumeA > 0;
  const karaokeBarH = (viewMode === 'raster' && karaokeOn) ? Math.max(36, Math.round(64 * scale)) : 0;

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
          {presets.map((p, i) => (
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
                onPress={() => isSaveMode ? handleSaveToSlot(i) : loadPreset(p)}
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
          style={[styles.viewBtn, viewMode === 'raster' && styles.viewBtnActive, scale < 1 && { paddingVertical: Math.max(4, Math.round(10 * scale)) }]}
          onPress={() => setViewMode('raster')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'raster' && styles.viewBtnTxtActive]}>
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
      </View>

      {/* Micro / Pulse / Frequency sliders – single horizontal row */}
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
    </>
  );

  const canvasSection = (
    <View style={[styles.canvasArea, isLandscape && styles.canvasAreaLandscape]}>
      {viewMode === 'raster' ? (
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
      ) : (
        <CircleViz
          trackA={trackA} trackB={trackB}
          activeBeatA={activeBeatA} activeBeatB={activeBeatB}
          isPlaying={isPlaying} beatIntervalSec={beatIntervalSec}
          microAccents={microAccents}
          karaokeOn={karaokeOn}
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
              customPhrases={customPhrases}
            />
          </View>
          {playButton}
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  presetBtnWrapper: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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
