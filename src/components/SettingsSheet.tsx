import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import type { ClickSound } from '../audio/AudioEngine';

const BG  = '#0f0f0f';
const BG2 = '#1a1a2e';
const BG3 = '#16213e';
const ACCENT   = '#ff6b35';
const ACCENT_B = '#e8aa14';
const BORDER   = '#2a2a4a';
const SHEET_HEIGHT = 580;

const SOUND_OPTIONS: { value: ClickSound; label: string }[] = [
  { value: 'sine-low',  label: 'Low'  },
  { value: 'sine-mid',  label: 'Mid'  },
  { value: 'sine-high', label: 'High' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  soundA: ClickSound;
  soundB: ClickSound;
  onSoundA: (s: ClickSound) => void;
  onSoundB: (s: ClickSound) => void;
  karaokeOn: boolean;
  onToggleKaraoke: () => void;
  customPhrases: Record<number, string>;
  onCustomPhrase: (sylCount: number, text: string) => void;
}

export function SettingsSheet({
  visible,
  onClose,
  soundA,
  soundB,
  onSoundA,
  onSoundB,
  karaokeOn,
  onToggleKaraoke,
  customPhrases,
  onCustomPhrase,
}: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  // One draft string per syllable count 2-12
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  // Sync drafts when sheet opens
  useEffect(() => {
    if (visible) setDrafts({ ...customPhrases });
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── KLANG ── */}
          <Text style={styles.sectionTitle}>KLANG</Text>

          {/* Sound A */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: ACCENT }]}>Track A</Text>
            <View style={styles.btnGroup}>
              {SOUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.soundBtn,
                    soundA === opt.value && styles.soundBtnActiveA,
                  ]}
                  onPress={() => onSoundA(opt.value)}
                >
                  <Text
                    style={[
                      styles.soundBtnTxt,
                      soundA === opt.value && styles.soundBtnTxtActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sound B */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: ACCENT_B }]}>Track B</Text>
            <View style={styles.btnGroup}>
              {SOUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.soundBtn,
                    soundB === opt.value && styles.soundBtnActiveB,
                  ]}
                  onPress={() => onSoundB(opt.value)}
                >
                  <Text
                    style={[
                      styles.soundBtnTxt,
                      soundB === opt.value && styles.soundBtnTxtActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── ANZEIGE ── */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>ANZEIGE</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Karaoke-Text</Text>
            <Switch
              value={karaokeOn}
              onValueChange={onToggleKaraoke}
              trackColor={{ false: BORDER, true: ACCENT }}
              thumbColor="#fff"
            />
          </View>

          {/* ── EIGENE SPRÜCHE ── */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>EIGENE SPRÜCHE</Text>
          <Text style={styles.sylHint}>Pro Silbenanzahl einen eigenen Spruch definieren · Wörter durch Leerzeichen trennen</Text>
          {[2,3,4,5,6,7,8,9,10,11,12].map((n) => {
            const val = drafts[n] ?? '';
            return (
              <View key={n} style={styles.phraseRow}>
                <Text style={styles.phraseCountLabel}>{n}</Text>
                <TextInput
                  style={styles.phraseInput}
                  value={val}
                  onChangeText={(t) => setDrafts(d => ({ ...d, [n]: t }))}
                  onBlur={() => onCustomPhrase(n, drafts[n] ?? '')}
                  placeholder={`${n} Wörter…`}
                  placeholderTextColor="#3a4060"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => onCustomPhrase(n, drafts[n] ?? '')}
                />
                {val.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => {
                      setDrafts(d => ({ ...d, [n]: '' }));
                      onCustomPhrase(n, '');
                    }}
                  >
                    <Text style={styles.clearBtnTxt}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnTxt}>Schließen</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: BG2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    marginTop: 10,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#5a6080',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rowLabel: {
    color: '#c0c8e0',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 70,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  soundBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BG3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  soundBtnActiveA: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  soundBtnActiveB: {
    backgroundColor: ACCENT_B,
    borderColor: ACCENT_B,
  },
  soundBtnTxt: {
    color: '#8892b0',
    fontSize: 13,
    fontWeight: '600',
  },
  soundBtnTxtActive: {
    color: '#fff',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  closeBtnTxt: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '600',
  },
  phraseCountLabel: {
    color: '#5a6080',
    fontSize: 12,
    fontWeight: '700',
    width: 20,
    textAlign: 'right',
    marginRight: 6,
  },
  sylHint: {
    color: '#5a6080',
    fontSize: 11,
    marginBottom: 8,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  phraseInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: BG3,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    color: '#e0e0e0',
    fontSize: 14,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnTxt: {
    color: '#8892b0',
    fontSize: 18,
    lineHeight: 20,
  },
});
