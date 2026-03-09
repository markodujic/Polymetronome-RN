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
  const accentColor = isMaster ? '#ff6b35' : '#e8aa14';

  return (
    <View style={[styles.container, isSelected && styles.selected]}>
      {/* Header: label button + beats control */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.labelBtn,
            { backgroundColor: accentColor },
          ]}
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[styles.labelText, { color: isSelected ? '#fff' : 'rgba(0,0,0,0.75)' }]}>
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

const BG = '#0f0f0f';
const BG2 = '#1a1a2e';
const BG3 = '#16213e';
const BORDER = '#2a2a4a';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  selected: {
    backgroundColor: BG2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelTextSelected: {
    color: '#fff',
  },
  beatsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#8892b0',
    fontSize: 20,
    lineHeight: 22,
  },
  beatsValue: {
    color: '#e0e0e0',
    fontSize: 26,
    fontWeight: '700',
    minWidth: 36,
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
    width: 95,
    backgroundColor: BG3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#8892b0',
    height: 36,
  },
});
