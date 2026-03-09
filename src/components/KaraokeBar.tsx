import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useKaraokeSyllable } from '../hooks/useKaraokeSyllable';
import { type MetronomeTrack } from '../audio/AudioEngine';

interface KaraokeBarProps {
  trackA: MetronomeTrack;
  trackB: MetronomeTrack;
  activeBeatA: number | null;
  activeBeatB: number | null;
  isPlaying: boolean;
  karaokeOn: boolean;
  onToggleKaraoke: () => void;
}

const TYPE_COLORS: Record<'a' | 'b' | 'ab', string> = {
  a: '#ff6b35',
  b: '#e8aa14',
  ab: '#ffffff',
};

export function KaraokeBar({
  trackA, trackB,
  activeBeatA, activeBeatB,
  isPlaying, karaokeOn, onToggleKaraoke,
}: KaraokeBarProps) {
  const { text, typeCls, isLong, isActive, flashKey, cyclePhrase } =
    useKaraokeSyllable(trackA, trackB, activeBeatA, activeBeatB, isPlaying);

  // Flash animation: quickly pulse opacity on each beat
  const flashAnim = useRef(new Animated.Value(1)).current;
  const prevFlashKey = useRef(flashKey);

  useEffect(() => {
    if (flashKey !== prevFlashKey.current && isActive) {
      prevFlashKey.current = flashKey;
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1.6, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [flashKey, isActive, flashAnim]);

  const textColor = TYPE_COLORS[typeCls];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleBtn, karaokeOn && styles.toggleBtnOn]}
        onPress={onToggleKaraoke}
        accessibilityLabel={karaokeOn ? 'Hide phrases' : 'Show phrases'}
      >
        <Text style={styles.toggleIcon}>💬</Text>
      </TouchableOpacity>

      {karaokeOn && (
        <TouchableOpacity
          style={styles.sylRow}
          onPress={cyclePhrase}
          accessibilityLabel="Next phrase"
        >
          <Animated.Text
            style={[
              styles.syllable,
              { color: textColor },
              isLong && styles.syllableLong,
              !isPlaying && styles.syllablePreview,
              { opacity: flashAnim },
            ]}
          >
            {text}
          </Animated.Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtn: {
    position: 'absolute',
    left: 12,
    padding: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  toggleBtnOn: {
    backgroundColor: '#2a2a2a',
  },
  toggleIcon: {
    fontSize: 18,
  },
  sylRow: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  syllable: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 36,
  },
  syllableLong: {
    letterSpacing: 4,
  },
  syllablePreview: {
    opacity: 0.4,
  },
});
