# Polymetronome

Ein polyrhythmischer Metronom für Android und iOS, gebaut mit React Native (Expo).

## Features

- **Zwei unabhängige Rhythmusspuren** (A und B) mit konfigurierbaren Taktarten
- **Polyrhythmus-Visualisierung** in zwei Modi:
  - **Grid** – Rasteransicht mit anklickbaren Beats und Micro-Akzenten
  - **Circle** – Kreisförmige Animation beider Spuren
- **Karaoke-Bar** – zeigt Silben und Rhythmus-Syllablen synchron zu den Beats
- **Lautstärkesteuerung** für Track A, Track B, Micro-Akzente und Puls-Ton
- **BPM-Steuerung** per Slider (20–300 BPM) und Tap-Tempo
- **Haptisches Feedback** beim Play/Stop
- **Portrait & Landscape** Layout

## Projektstruktur

```
App.tsx                  # Root-Komponente, Layout & State-Management
src/
  audio/
    AudioEngine.ts       # Web Audio API Wrapper (react-native-audio-api)
  components/
    RhythmTrack.tsx      # UI-Komponente für eine Rhythmusspur (Beats, Volume, Sound)
    PolyCanvas.tsx       # Grid-Visualisierung der Polyrhythmen
    CircleViz.tsx        # Kreis-Visualisierung der Polyrhythmen
    KaraokeBar.tsx       # Beat-synchrone Silben-/Textanzeige
  hooks/
    useMetronome.ts      # Kernlogik: BPM, Tracks, Scheduling, State
    useKaraokeSyllable.ts # Karaoke-Silben-Logik
```

## Entwicklung

Siehe [SETUP.md](SETUP.md) für Installationsanleitung und Hinweise zu Windows.

### Schnellstart

```powershell
# Umgebungsvariablen setzen (Windows)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;C:\Program Files\Git\usr\bin;$env:PATH"

# App starten (erster Build)
cd C:\rn   # Junction zu diesem Projektordner (wichtig wegen Pfadlängenlimit)
npx expo run:android

# Nur Metro starten (nach erstem Build)
npx expo start --port 8081
```

## Abhängigkeiten

| Paket | Zweck |
|---|---|
| `react-native-audio-api` | Low-latency Audio (Web Audio API) |
| `react-native-reanimated` | Animationen |
| `react-native-svg` | SVG-Grafiken für Visualisierungen |
| `nativewind` | Tailwind CSS für React Native |
| `expo-haptics` | Haptisches Feedback |
| `@react-native-community/slider` | BPM- und Lautstärke-Slider |
