import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { type MetronomeTrack } from '../audio/AudioEngine';
import { useKaraokeSyllable } from '../hooks/useKaraokeSyllable';

interface CircleVizProps {
  trackA: MetronomeTrack;
  trackB: MetronomeTrack;
  activeBeatA: number | null;
  activeBeatB: number | null;
  isPlaying: boolean;
  beatIntervalSec: number;
  microAccents?: boolean[];
  karaokeOn?: boolean;
}

const CX = 150;
const CY = 150;
const R_A_OUTER = 138;
const R_A_INNER = 100;
const R_B_OUTER = 88;
const R_B_INNER = 52;
const R_ACC_OUTER = 98;
const R_ACC_INNER = 90;
const GAP_DEG = 2;
const ACC_GAP_DEG = 1.5;
const TAIL_SEGS = 6;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function sectorPath(rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const px = (r: number, a: number) => (CX + r * Math.cos(a)).toFixed(2);
  const py = (r: number, a: number) => (CY + r * Math.sin(a)).toFixed(2);
  return [
    `M ${px(rOuter, s)} ${py(rOuter, s)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${px(rOuter, e)} ${py(rOuter, e)}`,
    `L ${px(rInner, e)} ${py(rInner, e)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${px(rInner, s)} ${py(rInner, s)}`,
    'Z',
  ].join(' ');
}

// Color constants
const COLORS = {
  bgA: 'rgba(255,107,53,0.08)',
  hitA: '#ff6b35',
  accentA: 'rgba(255,107,53,0.08)',
  tailA: '#7dd3fc',
  headA: '#7dd3fc',
  bgB: 'rgba(232,170,20,0.08)',
  hitB: '#e8aa14',
  accentB: 'rgba(232,170,20,0.08)',
  tailB: '#7dd3fc',
  headB: '#7dd3fc',
  accentOn: 'rgba(100,200,255,0.85)',
  accentOff: 'rgba(255,255,255,0.06)',
  centerPivot: '#2a2a4a',
  sylA: '#ff6b35',
  sylB: '#e8aa14',
  sylAB: '#fff',
};

function AccentGapRing({ microAccents }: { microAccents: boolean[] }) {
  const n = microAccents.length;
  if (n === 0) return null;
  const sliceDeg = 360 / n;
  return (
    <G>
      {microAccents.map((active, i) => {
        const startDeg = -90 + i * sliceDeg + ACC_GAP_DEG / 2;
        const endDeg = -90 + (i + 1) * sliceDeg - ACC_GAP_DEG / 2;
        return (
          <Path
            key={i}
            d={sectorPath(R_ACC_INNER, R_ACC_OUTER, startDeg, endDeg)}
            fill={active ? COLORS.accentOn : COLORS.accentOff}
          />
        );
      })}
    </G>
  );
}

interface RingProps {
  beats: number;
  activeBeat: number | null;
  accents: boolean[];
  sweep: number;
  rInner: number;
  rOuter: number;
  colors: { bg: string; hit: string; accent: string; tail: string; head: string };
}

function Ring({ beats, activeBeat, accents, sweep, rInner, rOuter, colors }: RingProps) {
  const sliceDeg = 360 / beats;
  const beatStart = (i: number) => -90 + i * sliceDeg + GAP_DEG / 2;
  const beatEnd = (i: number) => -90 + (i + 1) * sliceDeg - GAP_DEG / 2;

  return (
    <G>
      {Array.from({ length: beats }, (_, i) => {
        const isActive = i === activeBeat;
        const isAccent = accents[i] ?? false;
        let fill = colors.bg;
        if (isActive) fill = colors.hit;
        else if (isAccent) fill = colors.accent;
        return (
          <Path
            key={i}
            d={sectorPath(rInner, rOuter, beatStart(i), beatEnd(i))}
            fill={fill}
          />
        );
      })}

      {/* Comet-tail sweep */}
      {activeBeat !== null && sweep > 0.005 && (() => {
        const start = beatStart(activeBeat);
        const maxSweep = sliceDeg - GAP_DEG;
        const sweepArc = sweep * maxSweep;
        return Array.from({ length: TAIL_SEGS }, (_, t) => {
          const segStart = start + (t / TAIL_SEGS) * sweepArc;
          const segEnd = start + ((t + 1) / TAIL_SEGS) * sweepArc;
          if (segEnd - segStart < 0.01) return null;
          const isHead = t === TAIL_SEGS - 1;
          return (
            <Path
              key={`tail-${t}`}
              d={sectorPath(rInner, rOuter, segStart, segEnd)}
              fill={isHead ? colors.head : colors.tail}
              opacity={(t + 1) / TAIL_SEGS}
            />
          );
        });
      })()}
    </G>
  );
}

export function CircleViz({
  trackA, trackB,
  activeBeatA, activeBeatB,
  isPlaying, beatIntervalSec,
  microAccents = [],
  karaokeOn = false,
}: CircleVizProps) {
  const { width, height } = useWindowDimensions();
  const vizSize = Math.min(width, height * 0.45, 300);
  const [sweepA, setSweepA] = useState(0);
  const [sweepB, setSweepB] = useState(0);
  const lastBeatTimeARef = useRef<number>(0);
  const lastBeatTimeBRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeBeatA !== null) lastBeatTimeARef.current = Date.now();
  }, [activeBeatA]);

  useEffect(() => {
    if (activeBeatB !== null) lastBeatTimeBRef.current = Date.now();
  }, [activeBeatB]);

  useEffect(() => {
    if (!isPlaying) {
      setSweepA(0);
      setSweepB(0);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const msA = beatIntervalSec * 1000;
    const msB = (beatIntervalSec * trackA.beats / trackB.beats) * 1000;

    const tick = () => {
      const now = Date.now();
      const tA = Math.min(1, (now - lastBeatTimeARef.current) / msA);
      const tB = Math.min(1, (now - lastBeatTimeBRef.current) / msB);
      setSweepA(tA * tA);
      setSweepB(tB * tB);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, beatIntervalSec, trackA.beats, trackB.beats]);

  const kar = useKaraokeSyllable(trackA, trackB, activeBeatA, activeBeatB, isPlaying);

  const sylColor = kar.typeCls === 'a' ? COLORS.sylA : kar.typeCls === 'b' ? COLORS.sylB : COLORS.sylAB;

  return (
    <View style={styles.outerWrapper}>
    <View style={[styles.container, { width: vizSize, height: vizSize }]}>
      <Svg
        viewBox="0 0 300 300"
        width="100%"
        height="100%"
        accessibilityLabel="Polyrhythm Circle Visualizer"
      >
        <Ring
          beats={trackA.beats}
          activeBeat={activeBeatA}
          accents={trackA.accents}
          sweep={sweepA}
          rInner={R_A_INNER}
          rOuter={R_A_OUTER}
          colors={{ bg: COLORS.bgA, hit: COLORS.hitA, accent: COLORS.accentA, tail: COLORS.tailA, head: COLORS.headA }}
        />
        <Ring
          beats={trackB.beats}
          activeBeat={activeBeatB}
          accents={trackB.accents}
          sweep={sweepB}
          rInner={R_B_INNER}
          rOuter={R_B_OUTER}
          colors={{ bg: COLORS.bgB, hit: COLORS.hitB, accent: COLORS.accentB, tail: COLORS.tailB, head: COLORS.headB }}
        />
        <AccentGapRing microAccents={microAccents} />

        {!karaokeOn && (
          <Circle cx={CX} cy={CY} r={5} fill={COLORS.centerPivot} />
        )}
        {karaokeOn && (
          <G onPress={kar.cyclePhrase}>
            <SvgText
              key={kar.isActive ? `k-${kar.flashKey}` : 'k'}
              x={CX}
              y={CY}
              textAnchor="middle"
              alignmentBaseline="central"
              fill={sylColor}
              fontSize={kar.isLong ? 28 : 24}
              fontWeight="bold"
              opacity={kar.isActive ? 1 : 0.35}
            >
              {kar.text}
            </SvgText>
          </G>
        )}
      </Svg>

    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: '#0f0f0f',
  },
  outerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  karaokeToggle: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,10,20,0.6)',
  },
  karaokeToggleOn: {
    backgroundColor: 'rgba(100,100,100,0.6)',
  },
  karaokeToggleIcon: {
    fontSize: 18,
  },
});
