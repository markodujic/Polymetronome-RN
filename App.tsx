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
    toggleMicroAccent, setSound, pulseFreq, setPulseFreq,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      {/* BPM Section */}
      <View style={styles.bpmSection}>
        <Text style={styles.appTitle}>
          <Text style={styles.titlePoly}>Poly</Text>
          <Text style={styles.titleMetro}>metronome</Text>
        </Text>
        <View style={styles.bpmDisplay}>
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text style={styles.bpmUnit}>BPM</Text>
        </View>
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
            minimumTrackTintColor="#f90"
            maximumTrackTintColor="#444"
            thumbTintColor="#f90"
          />
          <TouchableOpacity style={styles.bpmStepBtn} onPress={() => applyBpm(bpm + 1)}>
            <Text style={styles.stepTxt}>+</Text>
          </TouchableOpacity>
        </View>
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

      {/* Micro / Pulse / Frequency sliders */}
      <View style={styles.sliderGroup}>
        <SliderRow
          label="Micro"
          muted={volumeMicro === 0}
          onMute={muteMicro}
          value={volumeMicro}
          onValueChange={(v) => changeVolume('micro', v)}
        />
        <SliderRow
          label="Pulse"
          muted={volumePulse === 0}
          onMute={mutePulse}
          value={volumePulse}
          onValueChange={(v) => changeVolume('pulse', v)}
        />
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{pulseFreq} Hz</Text>
          <Slider
            style={styles.auxSlider}
            minimumValue={50}
            maximumValue={5000}
            value={pulseFreq}
            step={10}
            onValueChange={setPulseFreq}
            minimumTrackTintColor="#add8e6"
            maximumTrackTintColor="#444"
            thumbTintColor="#add8e6"
          />
        </View>
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
    <TouchableOpacity
      style={[styles.playBtn, isPlaying && styles.playBtnActive, isLandscape && styles.playBtnLandscape]}
      onPress={handleToggle}
      accessibilityLabel={isPlaying ? 'Stop' : 'Play'}
      accessibilityRole="button"
    >
      <Text style={styles.playBtnIcon}>{isPlaying ? '⏹' : '▶'}</Text>
    </TouchableOpacity>
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
        // Portrait: single column scroll
        <ScrollView style={styles.portraitScroll} contentContainerStyle={styles.portraitContent}>
          {controlsSection}
          {canvasSection}
          {playButton}
        </ScrollView>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Small reusable slider row component
function SliderRow({
  label, muted, onMute, value, onValueChange,
}: {
  label: string;
  muted: boolean;
  onMute: () => void;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <TouchableOpacity onPress={onMute} style={styles.sliderLabelBtn}>
        <Text style={[styles.sliderLabel, muted && styles.sliderLabelMuted]}>
          {label}
        </Text>
      </TouchableOpacity>
      <Slider
        style={styles.auxSlider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={muted ? '#555' : '#add8e6'}
        maximumTrackTintColor="#444"
        thumbTintColor={muted ? '#555' : '#add8e6'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  // Portrait layout
  portraitScroll: {
    flex: 1,
  },
  portraitContent: {
    paddingBottom: 24,
  },
  // Landscape layout
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftCol: {
    width: '42%',
    backgroundColor: '#0f0f0f',
  },
  leftColContent: {
    paddingBottom: 16,
  },
  rightCol: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
  },
  // BPM Section
  bpmSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    letterSpacing: 1,
    marginBottom: 8,
  },
  titlePoly: {
    color: '#f90',
    fontWeight: '700',
  },
  titleMetro: {
    color: '#e0e0e0',
    fontWeight: '300',
  },
  bpmDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bpmValue: {
    color: '#e0e0e0',
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bpmUnit: {
    color: '#888',
    fontSize: 14,
    fontWeight: '400',
  },
  bpmControls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  bpmStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
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
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  viewBtnActive: {
    borderColor: '#f90',
    backgroundColor: 'rgba(255,153,0,0.12)',
  },
  viewBtnTxt: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  viewBtnTxtActive: {
    color: '#f90',
  },
  // Slider group
  sliderGroup: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
  },
  sliderLabelBtn: {
    width: 50,
  },
  sliderLabel: {
    color: '#add8e6',
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },
  sliderLabelMuted: {
    color: '#555',
    textDecorationLine: 'line-through',
  },
  auxSlider: {
    flex: 1,
    height: 36,
  },
  // Canvas area
  canvasArea: {
    marginTop: 8,
    width: '100%',
  },
  canvasAreaLandscape: {
    flex: 1,
  },
  // Play button
  playBtn: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#f90',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  playBtnActive: {
    backgroundColor: 'rgba(255,153,0,0.15)',
  },
  playBtnLandscape: {
    width: '90%',
    height: 48,
    borderRadius: 24,
    marginHorizontal: '5%',
    alignSelf: 'stretch',
  },
  playBtnIcon: {
    color: '#f90',
    fontSize: 22,
  },
});
