import { memo, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
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
  pulseActive?: boolean;
  beatIntervalSec?: number;
}

// Colors matching web app's CSS custom properties
const COLOR_A_HIT = '#f90';
const COLOR_B_HIT = '#ff0';
const COLOR_BOTH = '#ffffff';
const COLOR_EMPTY = '#1a1a1a';
const COLOR_ACTIVE_A = '#ffb347';
const COLOR_ACTIVE_B = '#ffff80';
const COLOR_ACCENT_ON = 'rgba(100,200,255,0.85)';
const COLOR_ACCENT_OFF = 'rgba(255,255,255,0.08)';
const COLOR_PULSE = 'rgba(173,216,230,'; // light-blue, append opacity

const CELL_HEIGHT = 80; // total height per column (Track A + accent + Track B)
const ACCENT_H = 8;

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
  pulseActive = false,
  beatIntervalSec: _beatIntervalSec = 0.5,
}: PolyCanvasProps) {
  const [containerWidth, setContainerWidth] = useState(320);

  const gridSize = lcm(trackA.beats, trackB.beats);
  const stepA = gridSize / trackA.beats;
  const stepB = gridSize / trackB.beats;

  const activeGridA = activeBeatA !== null ? activeBeatA * stepA : null;
  const activeGridB = activeBeatB !== null ? activeBeatB * stepB : null;

  const cellData = useMemo(() => {
    const cells: { isA: boolean; isB: boolean; beatB: number; level: number }[] = [];
    for (let i = 0; i < gridSize; i++) {
      const isA = i % stepA === 0;
      const isB = i % stepB === 0;
      const beatB = isB ? i / stepB : -1;
      const level = isB ? (trackB.beatLevels[beatB] ?? 1) : 1;
      cells.push({ isA, isB, beatB, level });
    }
    return cells;
  }, [gridSize, stepA, stepB, trackB.beatLevels]);

  const cellWidth = containerWidth / gridSize;
  // flex values for focused row
  const flexA = focusedTrack === 'A' ? 3 : 1;
  const flexB = focusedTrack === 'B' ? 3 : 1;
  const rowAHeight = (CELL_HEIGHT - ACCENT_H) * (flexA / (flexA + flexB));
  const rowBHeight = (CELL_HEIGHT - ACCENT_H) * (flexB / (flexA + flexB));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={gridSize > 16}
        contentContainerStyle={{ flexDirection: 'row' }}
      >
        {cellData.map(({ isA, isB, beatB, level }, i) => {
          const isActiveA = isPlaying && activeGridA === i;
          const isActiveB = isPlaying && activeGridB === i;

          // Pulse sweep visibility: opacity increases as we approach next A beat
          let pulseOpacity = 0;
          if (pulseActive && activeGridA !== null) {
            const nextA = (activeGridA + stepA) % gridSize;
            if (nextA > activeGridA) {
              if (i > activeGridA && i < nextA) {
                const pos = (i - activeGridA) / stepA;
                pulseOpacity = Math.pow(pos, 1.5) * 0.65;
              }
            } else {
              if (i > activeGridA) {
                const pos = (i - activeGridA) / stepA;
                pulseOpacity = Math.pow(pos, 1.5) * 0.65;
              } else if (i < nextA) {
                const pos = (gridSize - activeGridA + i) / stepA;
                pulseOpacity = Math.pow(pos, 1.5) * 0.65;
              }
            }
          }

          // Row A color
          let rowAColor = COLOR_EMPTY;
          if (isA && isActiveA) rowAColor = isB ? COLOR_BOTH : COLOR_ACTIVE_A;
          else if (isA) rowAColor = isB ? COLOR_BOTH : COLOR_A_HIT;

          // Row B color, adjusted for beat level
          let rowBColor = COLOR_EMPTY;
          if (isB) {
            const base = isA ? COLOR_BOTH : COLOR_B_HIT;
            rowBColor = isActiveB
              ? (isA ? '#fff' : COLOR_ACTIVE_B)
              : base;
          }
          // Dim for reduced beat level
          const rowBOpacity = isB ? (level >= 1 ? 1 : level >= 0.5 ? 0.55 : 0.15) : 1;

          return (
            <View
              key={i}
              style={[styles.cell, { width: cellWidth, height: CELL_HEIGHT }]}
            >
              {/* Row A */}
              <View
                style={[
                  styles.rowBase,
                  { height: rowAHeight, backgroundColor: rowAColor },
                ]}
              >
                {pulseOpacity > 0 && (
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: `${COLOR_PULSE}${pulseOpacity.toFixed(2)})` },
                    ]}
                  />
                )}
              </View>

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
  prev.onBeatBClick === next.onBeatBClick
);

const styles = StyleSheet.create({
  wrapper: {
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
