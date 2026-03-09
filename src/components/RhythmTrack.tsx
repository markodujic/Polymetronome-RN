import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlowSlider } from './GlowSlider';
import { Picker } from '@react-native-picker/picker';
import type { MetronomeTrack, ClickSound } from '../audio/AudioEngine';

const SOUND_OPTIONS: { value: ClickSound; label: string }[] = [
  { value: 'sine-low', label: 'Low' },
  { value: 'sine-mid', label: 'Mid' },
  { value: 'sine-high', label: 'High' },
];

interface RhythmTrackProps {
  label: string;
  track: MetronomeTrack;
  isMaster?: boolean;
  isSelected?: boolean;
  volume: number;
  onSelect?: () => void;
  onBeats: (beats: number) => void;
  onVolume: (v: number) => void;
  onMute?: () => void;
  onSound?: (sound: ClickSound) => void;
}

export const RhythmTrack = memo(function RhythmTrack({
  label,
  track,
  isMaster = false,
  isSelected = false,
  volume,
  onSelect,
  onBeats,
  onVolume,
  onMute,
  onSound,
}: RhythmTrackProps) {
  const accentColor = isMaster ? '#ff6b35' : '#e8aa14';

  return (
    <View style={[styles.container, isSelected && styles.selected]}>
      {/* Single compact row: label | − beats + | mute | slider | picker */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.labelBtn, { backgroundColor: accentColor }]}
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[styles.labelText, { color: isSelected ? '#fff' : 'rgba(0,0,0,0.75)' }]}>
            {label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.stepBtn} onPress={() => onBeats(track.beats - 1)}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.beatsValue}>{track.beats}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onBeats(track.beats + 1)}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onMute} style={styles.muteBtn}>
          <Text style={styles.muteIcon}>{volume > 0 ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>

        <GlowSlider
          sliderHeight={28}
          glowColor={accentColor}
          muted={volume === 0}
          value={volume}
          onValueChange={onVolume}
          minimumTrackTintColor={volume === 0 ? '#444' : accentColor}
          maximumTrackTintColor="#444"
        />

        {onSound && (
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={track.sound}
              onValueChange={(v) => onSound(v as ClickSound)}
              style={styles.picker}
              dropdownIconColor="#aaa"
              mode="dropdown"
            >
              {SOUND_OPTIONS.map((s) => (
                <Picker.Item
                  key={s.value}
                  label={s.label}
                  value={s.value}
                  color="#e0e0e0"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>
    </View>
  );
});

const BG = '#0f0f0f';
const BG2 = '#1a1a2e';
const BG3 = '#16213e';
const BORDER = '#2a2a4a';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  selected: {
    backgroundColor: BG2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#8892b0',
    fontSize: 16,
    lineHeight: 18,
  },
  beatsValue: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  muteBtn: {
    padding: 2,
  },
  muteIcon: {
    fontSize: 15,
  },
  pickerWrap: {
    width: 82,
    backgroundColor: BG3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#8892b0',
    height: 32,
  },
});
