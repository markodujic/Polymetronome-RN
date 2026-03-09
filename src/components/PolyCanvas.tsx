import { memo, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
} from 'react-native';
import type { MetronomeTrack } from '../audio/AudioEngine';

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }

interface PolyCanvasProps {
  trackA: MetronomeTrack;
  trackB: MetronomeTrack;
  activeBeatA: number | null;
  activeBeatB: number | null;
  isPlaying: boolean;
  focusedTrack: 'A' | 'B';
  microAccents?: boolean[];
  onMicroAccentToggle?: (gridIndex: number) => void;
  onBeatBClick?: (beatIndex: number) => void;
  onBeatAAccentClick?: (beatIndex: number) => void;
  pulseActive?: boolean;
  beatIntervalSec?: number;
}

// Colors matching web app's CSS custom properties
const COLOR_A_HIT = '#ff6b35';
const COLOR_B_HIT = '#e8aa14';
const COLOR_EMPTY = '#16213e';
const COLOR_ACTIVE_A = '#ffb347';
const COLOR_ACTIVE_B = '#ffff80';
const COLOR_ACCENT_ON = 'rgba(100,200,255,0.85)';
const COLOR_ACCENT_OFF = 'rgba(255,255,255,0.08)';
const COLOR_PULSE = 'rgba(173,216,230,'; // light-blue, append opacity

const CELL_HEIGHT = 80;
const ACCENT_H = 8;

// Pulse glow: fades in after a delay, exactly like the web app's CSS animation
function PulseGlow({ delay, intensity }: { delay: number; intensity: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: intensity,
        duration: 60,
        useNativeDriver: true,
      }).start();
    }, delay * 1000);
    return () => clearTimeout(t);
  }, []); // intentionally empty – remount via key handles reset
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: '#7dd3fc',
          borderRadius: 3,
          opacity,
          pointerEvents: 'none' as any,
        },
      ]}
    />
  );
}

export const PolyCanvas = memo(function PolyCanvas({
  trackA,
  trackB,
  activeBeatA,
  activeBeatB,
  isPlaying,
  focusedTrack,
  microAccents = [],
  onMicroAccentToggle,
  onBeatBClick,
  onBeatAAccentClick,
  pulseActive = false,
  beatIntervalSec = 0.5,
}: PolyCanvasProps) {
  const [containerWidth, setContainerWidth] = useState(320);
  const [containerHeight, setContainerHeight] = useState(160);

  const prevActiveBeatARef = useRef<number | null>(null);
  // Track beat key for remounting pulse glows
  const [beatKey, setBeatKey] = useState(0);
  useEffect(() => {
    if (activeBeatA !== null && activeBeatA !== prevActiveBeatARef.current) {
      prevActiveBeatARef.current = activeBeatA;
      setBeatKey(k => k + 1);
    }
  }, [activeBeatA]);

  const gridSize = lcm(trackA.beats, trackB.beats);
  const stepA = gridSize / trackA.beats;
  const stepB = gridSize / trackB.beats;

  const activeGridA = activeBeatA !== null ? activeBeatA * stepA : null;
  const activeGridB = activeBeatB !== null ? activeBeatB * stepB : null;

  const cellData = useMemo(() => {
    const cells: { isA: boolean; isB: boolean; beatA: number; beatB: number; level: number }[] = [];
    for (let i = 0; i < gridSize; i++) {
      const isA = i % stepA === 0;
      const isB = i % stepB === 0;
      const beatA = isA ? i / stepA : -1;
      const beatB = isB ? i / stepB : -1;
      const level = isB ? (trackB.beatLevels[beatB] ?? 1) : 1;
      cells.push({ isA, isB, beatA, beatB, level });
    }
    return cells;
  }, [gridSize, stepA, stepB, trackB.beatLevels]);

  const cellWidth = containerWidth / gridSize;
  // Dynamic cell height: fill available container height
  const cellHeight = Math.max(80, containerHeight);
  // flex values for focused row
  const flexA = focusedTrack === 'A' ? 3 : 1;
  const flexB = focusedTrack === 'B' ? 3 : 1;
  const rowAHeight = (cellHeight - ACCENT_H) * (flexA / (flexA + flexB));
  const rowBHeight = (cellHeight - ACCENT_H) * (flexB / (flexA + flexB));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
    setContainerHeight(e.nativeEvent.layout.height);
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={gridSize > 16}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {cellData.map(({ isA, isB, beatA, beatB, level }, i) => {
          const isActiveA = isPlaying && activeGridA === i;
          const isActiveB = isPlaying && activeGridB === i;

          // Pulse sweep: delay-based appearance per cell (like web app CSS animation-delay)
          let pulseDelay = -1;
          let pulseIntensity = 0;
          if (pulseActive && activeGridA !== null) {
            const nextA = (activeGridA + stepA) % gridSize;
            let pos = -1;
            if (nextA > activeGridA) {
              if (i > activeGridA && i < nextA) pos = (i - activeGridA) / stepA;
            } else {
              if (i > activeGridA) pos = (i - activeGridA) / stepA;
              else if (i < nextA) pos = (gridSize - activeGridA + i) / stepA;
            }
            if (pos > 0) {
              pulseDelay = pos * beatIntervalSec;
              pulseIntensity = Math.pow(pos, 1.5) * 0.65;
            }
          }

          // Row A color
          let rowAColor = COLOR_EMPTY;
          if (isA && isActiveA) rowAColor = COLOR_ACTIVE_A;
          else if (isA) rowAColor = COLOR_A_HIT;

          // Row B color, adjusted for beat level
          let rowBColor = COLOR_EMPTY;
          if (isB) {
            rowBColor = isActiveB ? COLOR_ACTIVE_B : COLOR_B_HIT;
          }
          // Dim for reduced beat level
          const rowBOpacity = isB ? (level >= 1 ? 1 : level >= 0.5 ? 0.55 : 0.15) : 1;

          return (
            <View
              key={i}
              style={[styles.cell, { width: cellWidth, height: cellHeight }]}
            >
              {/* Row A */}
              <TouchableOpacity
                style={[
                  styles.rowBase,
                  { height: rowAHeight, backgroundColor: rowAColor },
                ]}
                onPress={isA ? () => onBeatAAccentClick?.(beatA) : undefined}
                disabled={!isA}
                accessibilityLabel={isA ? `Track A beat ${beatA + 1} accent` : undefined}
              >
                {pulseDelay >= 0 && (
                  <PulseGlow key={`${beatKey}-${i}`} delay={pulseDelay} intensity={pulseIntensity} />
                )}
              </TouchableOpacity>

              {/* Accent strip */}
              <TouchableOpacity
                style={[
                  styles.accentRow,
                  { backgroundColor: microAccents[i] ? COLOR_ACCENT_ON : COLOR_ACCENT_OFF },
                ]}
                onPress={() => onMicroAccentToggle?.(i)}
                accessibilityLabel={`Micro accent cell ${i}`}
              />

              {/* Row B */}
              <TouchableOpacity
                style={[
                  styles.rowBase,
                  { height: rowBHeight, backgroundColor: rowBColor, opacity: rowBOpacity },
                ]}
                onPress={isB ? () => onBeatBClick?.(beatB) : undefined}
                disabled={!isB}
                accessibilityLabel={isB ? `Track B beat ${beatB + 1}` : undefined}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
},
(prev, next) =>
  prev.trackA.beats === next.trackA.beats &&
  prev.trackB.beats === next.trackB.beats &&
  prev.trackB.beatLevels === next.trackB.beatLevels &&
  prev.activeBeatA === next.activeBeatA &&
  prev.activeBeatB === next.activeBeatB &&
  prev.isPlaying === next.isPlaying &&
  prev.focusedTrack === next.focusedTrack &&
  prev.microAccents === next.microAccents &&
  prev.pulseActive === next.pulseActive &&
  prev.onMicroAccentToggle === next.onMicroAccentToggle &&
  prev.onBeatBClick === next.onBeatBClick &&
  prev.onBeatAAccentClick === next.onBeatAAccentClick
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0f0f0f',
  },
  cell: {
    flexDirection: 'column',
    paddingHorizontal: 1,
  },
  rowBase: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  accentRow: {
    width: '100%',
    height: ACCENT_H,
    borderRadius: 1,
    marginVertical: 1,
  },
});
