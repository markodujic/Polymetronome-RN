import './global.css';
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useMetronome } from './src/hooks/useMetronome';
import { RhythmTrack } from './src/components/RhythmTrack';
import { PolyCanvas } from './src/components/PolyCanvas';
import { CircleViz } from './src/components/CircleViz';
import { KaraokeBar } from './src/components/KaraokeBar';
import type { ClickSound } from './src/audio/AudioEngine';

export default function App() {
  const {
    bpm, trackA, trackB,
    isPlaying, activeBeatA, activeBeatB,
    volumeA, volumeB, volumeMicro, volumePulse,
    microAccents, toggle, applyBpm,
    setBeats, cycleBeatLevel, changeVolume,
    toggleMicroAccent, toggleAccent, setSound, pulseFreq, setPulseFreq,
  } = useMetronome();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [focusedTrack, setFocusedTrack] = useState<'A' | 'B'>('A');
  const [viewMode, setViewMode] = useState<'raster' | 'circle'>('raster');
  const [karaokeOn, setKaraokeOn] = useState(true);

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

  const controlsSection = (
    <>
      {/* Header row: i | BPM | Logo */}
      <View style={styles.headerRow}>
        <View style={styles.infoBtn}>
          <Text style={styles.infoBtnTxt}>i</Text>
        </View>
        <View style={styles.bpmDisplay}>
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text style={styles.bpmUnit}>BPM</Text>
        </View>
        <Text style={styles.appTitle}>
          <Text style={styles.titlePoly}>Poly</Text>
          <Text style={styles.titleMetro}>metronome</Text>
        </Text>
      </View>

      {/* BPM Slider row */}
      <View style={styles.bpmControls}>
        <TouchableOpacity style={styles.bpmStepBtn} onPress={() => applyBpm(bpm - 1)}>
          <Text style={styles.stepTxt}>−</Text>
        </TouchableOpacity>
        <Slider
          style={styles.bpmSlider}
          minimumValue={20}
          maximumValue={300}
          value={bpm}
          step={1}
          onValueChange={applyBpm}
          minimumTrackTintColor="#ff6b35"
          maximumTrackTintColor="#2a3a4a"
          thumbTintColor="#ff6b35"
        />
        <TouchableOpacity style={styles.bpmStepBtn} onPress={() => applyBpm(bpm + 1)}>
          <Text style={styles.stepTxt}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tracks */}
      <RhythmTrack label="A" track={trackA} isMaster isSelected={focusedTrack === 'A'}
        volume={volumeA} onSelect={() => setFocusedTrack('A')}
        onBeats={setBeatsA} onVolume={setVolA} onMute={muteA} onSound={setSoundA} />
      <RhythmTrack label="B" track={trackB} isMaster={false} isSelected={focusedTrack === 'B'}
        volume={volumeB} onSelect={() => setFocusedTrack('B')}
        onBeats={setBeatsB} onVolume={setVolB} onMute={muteB} onSound={setSoundB} />

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'raster' && styles.viewBtnActive]}
          onPress={() => setViewMode('raster')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'raster' && styles.viewBtnTxtActive]}>
            Grid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewBtn, viewMode === 'circle' && styles.viewBtnActive]}
          onPress={() => setViewMode('circle')}
        >
          <Text style={[styles.viewBtnTxt, viewMode === 'circle' && styles.viewBtnTxtActive]}>
            Circle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Micro / Pulse / Frequency sliders – single horizontal row */}
      <View style={styles.sliderGroup}>
        <CompactSlider
          label="MICRO"
          muted={volumeMicro === 0}
          onMute={muteMicro}
          value={volumeMicro}
          onValueChange={(v) => changeVolume('micro', v)}
        />
        <CompactSlider
          label="PULSE"
          muted={volumePulse === 0}
          onMute={mutePulse}
          value={volumePulse}
          onValueChange={(v) => changeVolume('pulse', v)}
        />
        <CompactSlider
          label={`${pulseFreq} HZ`}
          muted={false}
          onMute={() => {}}
          value={pulseFreq / 5000}
          onValueChange={(v) => setPulseFreq(Math.round(v * 5000 / 10) * 10 || 50)}
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
          onToggleKaraoke={() => setKaraokeOn(v => !v)}
        />
      )}
      {viewMode === 'raster' && (
        <KaraokeBar
          trackA={trackA} trackB={trackB}
          activeBeatA={activeBeatA} activeBeatB={activeBeatB}
          isPlaying={isPlaying} karaokeOn={karaokeOn}
          onToggleKaraoke={() => setKaraokeOn(v => !v)}
        />
      )}
    </View>
  );

  const playButton = (
    <View style={styles.playBtnBar}>
      <TouchableOpacity
        style={[styles.playBtn, isPlaying && styles.playBtnActive, isLandscape && styles.playBtnLandscape]}
        onPress={handleToggle}
        accessibilityLabel={isPlaying ? 'Stop' : 'Play'}
        accessibilityRole="button"
      >
        <Text style={styles.playBtnIcon}>{isPlaying ? '⏹' : '▶'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
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
        // Portrait: controls scroll, canvas stretches, play button fixed at bottom
        <View style={styles.portraitContainer}>
          <ScrollView style={styles.portraitScroll} contentContainerStyle={styles.portraitContent}>
            {controlsSection}
          </ScrollView>
          <View style={styles.canvasWrapper}>
            {canvasSection}
          </View>
          {playButton}
        </View>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Compact horizontal slider (label on top, slider below)
function CompactSlider({
  label, muted, onMute, value, onValueChange,
}: {
  label: string;
  muted: boolean;
  onMute: () => void;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <View style={styles.compactSliderCol}>
      <TouchableOpacity onPress={onMute}>
        <Text style={[styles.compactSliderLabel, muted && styles.sliderLabelMuted]}>
          {label}
        </Text>
      </TouchableOpacity>
      <Slider
        style={styles.compactSlider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={muted ? '#2a3a4a' : '#ff6b35'}
        maximumTrackTintColor="#2a3a4a"
        thumbTintColor={muted ? '#4a5a6a' : '#ff6b35'}
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  // Play button
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnActive: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
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
