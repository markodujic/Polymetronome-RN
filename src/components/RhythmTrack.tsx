import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
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
  const accentColor = isMaster ? '#f90' : '#ff0';

  return (
    <View style={[styles.container, isSelected && styles.selected]}>
      {/* Header: label button + beats control */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.labelBtn,
            { borderColor: accentColor },
            isSelected && { backgroundColor: accentColor },
          ]}
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[styles.labelText, isSelected && styles.labelTextSelected]}>
            {label}
          </Text>
        </TouchableOpacity>

        <View style={styles.beatsControl}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onBeats(track.beats - 1)}
            accessibilityLabel="Decrease beats"
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.beatsValue}>{track.beats}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onBeats(track.beats + 1)}
            accessibilityLabel="Increase beats"
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Volume row: mute icon + slider + sound picker */}
      <View style={styles.volumeRow}>
        <TouchableOpacity
          onPress={onMute}
          accessibilityLabel={volume > 0 ? 'Mute track' : 'Unmute track'}
          style={styles.muteBtn}
        >
          <Text style={styles.muteIcon}>{volume > 0 ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={onVolume}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor="#444"
          thumbTintColor={accentColor}
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  selected: {
    backgroundColor: '#222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  labelText: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  labelTextSelected: {
    color: '#000',
  },
  beatsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#e0e0e0',
    fontSize: 18,
    lineHeight: 20,
  },
  beatsValue: {
    color: '#e0e0e0',
    fontSize: 22,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  muteBtn: {
    padding: 4,
  },
  muteIcon: {
    fontSize: 18,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  pickerWrap: {
    width: 90,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    color: '#e0e0e0',
    height: 36,
  },
});
