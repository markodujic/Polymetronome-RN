import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { useKaraokeSyllable } from '../hooks/useKaraokeSyllable';
import { type MetronomeTrack } from '../audio/AudioEngine';

interface KaraokeBarProps {
  trackA: MetronomeTrack;
  trackB: MetronomeTrack;
  activeBeatA: number | null;
  activeBeatB: number | null;
  isPlaying: boolean;
  karaokeOn: boolean;
  customPhrases?: Record<number, string>;
}

const TYPE_COLORS: Record<'a' | 'b' | 'ab', string> = {
  a: '#ff6b35',
  b: '#e8aa14',
  ab: '#ffffff',
};

export function KaraokeBar({
  trackA, trackB,
  activeBeatA, activeBeatB,
  isPlaying, karaokeOn, customPhrases,
}: KaraokeBarProps) {
  const { text, typeCls, isLong, isActive, flashKey, cyclePhrase } =
    useKaraokeSyllable(trackA, trackB, activeBeatA, activeBeatB, isPlaying, customPhrases);

  // Impulse effect: scale 1.25→1 + #7dd3fc glow → textcolor, like web-app karaoke-pulse
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current; // 1=glow, 0=no glow
  const prevFlashKey = useRef(flashKey);

  useEffect(() => {
    if (flashKey !== prevFlashKey.current && isActive) {
      prevFlashKey.current = flashKey;
      scaleAnim.setValue(1.25);
      glowAnim.setValue(1);
      // Run separately – parallel() does not allow mixing useNativeDriver true/false
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }
  }, [flashKey, isActive, scaleAnim, glowAnim]);

  const textColor = TYPE_COLORS[typeCls];
  const shadowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });

  return (
    <View style={styles.container}>
      {karaokeOn && (
        <TouchableOpacity
          style={styles.sylRow}
          onPress={cyclePhrase}
          accessibilityLabel="Next phrase"
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Animated.Text
              style={[
                styles.syllable,
                { color: textColor },
                isLong && styles.syllableLong,
                !isPlaying && styles.syllablePreview,
                Platform.OS !== 'web' && {
                  textShadowColor: 'rgba(125, 211, 252, 0.9)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: shadowRadius,
                },
              ]}
            >
              {text}
            </Animated.Text>
          </Animated.View>
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
    overflow: 'visible',
  },
  sylRow: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  syllable: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    textAlign: 'center',
    lineHeight: 36,
  },
  syllableLong: {
    letterSpacing: 2,
  },
  syllablePreview: {
    opacity: 0.4,
  },
});
