# Polymetronome RN – Copilot Instructions

## Projekt
React Native **Expo**-App (TypeScript) für polyrhythmische Metronome-Übungen.  
Zielplattform: primär **Android** (nativ), Web als Preview.

## Architektur-Kurzüberblick
- **`App.tsx`** – Root: BPM-Slider, Preset-Canvas (8 Slots), Transport-Leiste
- **`src/audio/AudioEngine.ts`** – LCM-Grid-Scheduler, Singleton, look-ahead audio
- **`src/hooks/useMetronome.ts`** – React-State-Brücke zum AudioEngine
- **`src/hooks/usePresets.ts`** – AsyncStorage-Persistenz für 8 Preset-Slots
- **`src/hooks/useKaraokeSyllable.ts`** – Union-Beat-Mapping + Phrase-Timing
- **`src/components/RhythmTrack.tsx`** – Kompakte Track-Zeile (Label, Beats, Volume)
- **`src/components/PolyCanvas.tsx`** – Mikroraster (LCM-Grid-Canvas)
- **`src/components/CircleViz.tsx`** – SVG Kreis-Visualizer mit Karaoke-Overlay
- **`src/components/KaraokeBar.tsx`** – Karaoke-Phrase-Leiste (Raster-Ansicht)
- **`src/components/GlowSlider.tsx`** – Slider mit animiertem Halo
- **`src/components/SettingsSheet.tsx`** – Bottom-Sheet: Sound-Wahl, Karaoke, Custom-Phrases

## Schlüssel-Konzepte
- **Track B BPM** wird immer aus Track A abgeleitet: `bpmB = bpmA × beatsB / beatsA`
- **LCM-Grid** ist das Herzstück: alle Beats beider Tracks liegen auf einem gemeinsamen LCM-Zeitraster
- **Preset-Slots**: 8 Stück, gespeichert in AsyncStorage; Save-Mode via ✎-Button (`isSaveMode`)
- **`savedGlowAnim`** (Animated.Value, 1→0 in 900 ms) steuert den gelben Glow-Impuls nach dem Speichern; Shadow liegt auf äußerem `Animated.View` (nicht auf `overflow:hidden`-Button)
- **Haptics** via `expo-haptics`, immer in `try/catch` gewrappt

## Wichtige Referenz-Dateien
| Datei | Wofür nachschlagen |
|---|---|
| `ARCHITECTURE.md` | Detaillierter Component-Tree + alle State-Werte |
| `AUDIO_ENGINE.md` | AudioEngine-Internals, Scheduling-Logik |
| `CHANGELOG.md` | Was wann geändert wurde |
| `TODO.md` | Offene Features + bekannte Bugs |
| `/memories/repo/android-emulation-setup.md` | Build-Befehle für Android-Emulator |

## Code-Konventionen
- **StyleSheet.create** für alle Styles (kein inline-Objekt-Chaos)
- Shadow-Effekte: `shadow*`-Props auf **äußerem** `Animated.View` (nicht auf `overflow:hidden`-View)
- Farben: `ACCENT = '#ff6b35'` (Track A orange), `ACCENT_B = '#e8aa14'` (Track B gelb), `BG/BG2/BG3` für Hintergründe
- Alle Slider-Werte 0–1; BPM 20–300
- `useNativeDriver: Platform.OS !== 'web'` — native driver auf Android/iOS, JS-driver im Web-Preview
- `useNativeDriver: false` wenn `shadowOpacity` oder Farb-Properties animiert werden
- `shadow*`-Props immer in `Platform.select({ native: {...}, web: { boxShadow } })` wrappen

## Build (Windows)
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;C:\Program Files\Git\usr\bin;$env:PATH"
cd C:\rn   # Junction zu echtem Pfad
npx expo run:android
```
