import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type MetronomeTrack } from '../audio/AudioEngine';

function _gcd(a: number, b: number): number { return b === 0 ? a : _gcd(b, a % b); }
function _lcm(a: number, b: number): number { return (a * b) / _gcd(a, b); }

const PHRASES: Record<number, string[][]> = {
  1: [["boom"], ["bam"], ["clap"]],
  2: [["hot", "dog"], ["let's", "go"], ["boom", "box"]],
  3: [["ham", "bur", "ger"], ["cho", "co", "late"], ["pine", "ap", "ple"]],
  4: [
    ["pass", "the", "but", "ter"],
    ["al", "li", "ga", "tor"],
    ["not", "my", "prob", "lem"],
  ],
  5: [
    ["hip", "po", "pot", "a", "mus"],
    ["ab", "ra", "ca", "da", "bra"],
    ["did", "you", "feed", "the", "cat"],
  ],
  6: [
    ["pass", "the", "god", "damn", "but", "ter"],
    ["I", "left", "my", "keys", "in", "side"],
    ["wa", "ter", "me", "lon", "is", "great"],
  ],
  7: [
    ["why", "is", "the", "rum", "al", "ways", "gone"],
    ["can", "you", "be", "lieve", "this", "rhy", "thm"],
    ["please", "don't", "drop", "the", "ba", "na", "na"],
  ],
  8: [
    ["su", "per", "ca", "li", "fra", "gi", "lis", "tic"],
    ["I", "for", "got", "to", "feed", "the", "ham", "ster"],
    ["some", "bo", "dy", "stop", "this", "me", "tro", "nome"],
  ],
  9: [
    ["no", "bo", "dy", "told", "me", "there", "would", "be", "math"],
    ["I", "real", "ly", "should", "have", "prac", "ticed", "this", "more"],
    ["why", "am", "I", "count", "ing", "syl", "la", "bles", "now"],
  ],
  10: [
    ["I", "should", "prob", "ab", "ly", "just", "buy", "a", "drum", "kit"],
    ["this", "is", "get", "ting", "ri", "dic", "u", "lous", "ly", "hard"],
  ],
  11: [
    ["my", "brain", "is", "do", "ing", "some", "thing", "real", "ly", "weird", "now"],
    ["this", "po", "ly", "rhy", "thm", "stuff", "is", "blow", "ing", "my", "mind"],
  ],
  12: [
    ["su", "per", "ca", "li", "fra", "gi", "lis", "tic", "ex", "pi", "a", "li"],
    ["this", "rhy", "thm", "is", "mak", "ing", "me", "ques", "tion", "my", "life", "choice"],
  ],
  13: [
    ["who", "e", "ven", "needs", "this", "ma", "ny", "beats", "in", "a", "sin", "gle", "bar"],
  ],
  14: [
    ["I", "am", "pret", "ty", "sure", "no", "hu", "man", "can", "ac", "tual", "ly", "play", "this"],
  ],
  15: [
    ["if", "you", "can", "real", "ly", "play", "this", "clean", "ly", "you", "de", "serve", "a", "gold", "star"],
  ],
  16: [
    ["su", "per", "ca", "li", "fra", "gi", "lis", "tic", "ex", "pi", "a", "li", "do", "cious", "is", "real"],
  ],
};

function getPhrasesForCount(n: number): string[][] {
  return PHRASES[n] ?? [Array.from({ length: n }, (_, i) => String(i + 1))];
}

export interface KaraokeSyllable {
  text: string;
  typeCls: 'a' | 'b' | 'ab';
  isLong: boolean;
  isActive: boolean;
  flashKey: number;
  cyclePhrase: () => void;
  phraseCount: number;
}

export function useKaraokeSyllable(
  trackA: MetronomeTrack,
  trackB: MetronomeTrack,
  activeBeatA: number | null,
  activeBeatB: number | null,
  isPlaying: boolean,
  customPhrases?: Record<number, string>,
): KaraokeSyllable {
  const { unionPos, aToSyl, bToSyl, sylType, sylCount } = useMemo(() => {
    const l = _lcm(trackA.beats, trackB.beats);
    const aSet = new Set<number>();
    const bSet = new Set<number>();
    for (let i = 0; i < trackA.beats; i++) aSet.add(i * l / trackA.beats);
    for (let j = 0; j < trackB.beats; j++) bSet.add(j * l / trackB.beats);
    const union = Array.from(new Set([...aSet, ...bSet])).sort((a, b) => a - b);
    const posToIdx = new Map(union.map((p, idx) => [p, idx]));
    const a2s = Array.from({ length: trackA.beats }, (_, i) => posToIdx.get(i * l / trackA.beats)!);
    const b2s = Array.from({ length: trackB.beats }, (_, j) => posToIdx.get(j * l / trackB.beats)!);
    const types: ('a' | 'b' | 'ab')[] = union.map(p =>
      aSet.has(p) && bSet.has(p) ? 'ab' : aSet.has(p) ? 'a' : 'b'
    );
    return { unionPos: union, aToSyl: a2s, bToSyl: b2s, sylType: types, sylCount: union.length };
  }, [trackA.beats, trackB.beats]);

  const longSyls = useMemo(() => {
    const set = new Set<number>();
    if (sylCount <= 1) return set;
    const l = _lcm(trackA.beats, trackB.beats);
    const gaps = unionPos.map((pos, i) =>
      (i + 1 < sylCount ? unionPos[i + 1] : l) - pos
    );
    const maxG = Math.max(...gaps);
    if (maxG === Math.min(...gaps)) return set;
    gaps.forEach((g, i) => { if (g === maxG) set.add(i); });
    return set;
  }, [unionPos, sylCount, trackA.beats, trackB.beats]);

  const phrases = useMemo(() => {
    const custom = customPhrases?.[sylCount];
    if (custom && custom.trim().length > 0) {
      const words = custom.trim().split(/\s+/);
      const fitted = Array.from({ length: sylCount }, (_, i) => words[i] ?? '·');
      return [fitted];
    }
    return getPhrasesForCount(sylCount);
  }, [sylCount, customPhrases]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [activeSylIdx, setActiveSylIdx] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const lastFlashMsRef = useRef(0);

  const currentPhrase = phrases[phraseIdx % phrases.length];

  useEffect(() => { setPhraseIdx(0); }, [trackA.beats, trackB.beats]);
  useEffect(() => { if (!isPlaying) setActiveSylIdx(null); }, [isPlaying]);

  useEffect(() => {
    if (activeBeatA !== null && aToSyl[activeBeatA] !== undefined) {
      setActiveSylIdx(aToSyl[activeBeatA]);
      const now = Date.now();
      if (now - lastFlashMsRef.current > 30) {
        lastFlashMsRef.current = now;
        setFlashKey(k => k + 1);
      }
    }
  }, [activeBeatA, aToSyl]);

  useEffect(() => {
    if (activeBeatB !== null && bToSyl[activeBeatB] !== undefined) {
      setActiveSylIdx(bToSyl[activeBeatB]);
      const now = Date.now();
      if (now - lastFlashMsRef.current > 30) {
        lastFlashMsRef.current = now;
        setFlashKey(k => k + 1);
      }
    }
  }, [activeBeatB, bToSyl]);

  const cyclePhrase = useCallback(() => {
    setPhraseIdx(i => (i + 1) % phrases.length);
  }, [phrases.length]);

  const idx = activeSylIdx ?? 0;
  const syl = currentPhrase[idx] ?? '';
  const isLong = longSyls.has(idx);

  return {
    text: isLong ? syl.toUpperCase() : syl,
    typeCls: sylType[idx] ?? 'ab',
    isLong,
    isActive: isPlaying && activeSylIdx !== null,
    flashKey,
    cyclePhrase,
    phraseCount: phrases.length,
  };
}
