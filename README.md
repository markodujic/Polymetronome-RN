# Polymetronome RN

A **polyrhythmic metronome** React Native app (Expo) for musicians who want to practise complex polyrhythms against a steady pulse.

> Runs natively on Android (and iOS) via Expo. Web preview available (`expo start --web`).

---

## Features

- **2-Track Polyrhythm** – Track A (master tempo) and Track B (derived tempo); both always finish their cycle in the same wall-clock time (`bpmB = bpmA × beatsB / beatsA`)
- **Precise Audio** – `react-native-audio-api` (Web Audio API polyfill) with look-ahead scheduling for sample-accurate timing
- **3 Sine Click Sounds** – Low / Mid / High (synthesized, no audio files); selectable per track in the Settings sheet
- **Pulse Tone** – rising sine oscillator between Track A beats; configurable frequency (50–5000 Hz) and volume
- **3-State Beat Levels** – tap Track B beats in the Mikroraster to cycle 100% → 50% → 0% volume per beat
- **Beats 1–16** – adjustable beat count per track
- **Accent Patterns** – tap beat cells to toggle accents on Track A
- **Mikroraster (Grid View)** – LCM grid showing exactly where each pattern's beats fall relative to the other; active beats highlighted per track color
- **Circle Visualizer** – SVG concentric rings; active beats pulse on each track's ring
- **Micro-Click** – volume & accent ticks in the LCM grid
- **Micro-Accents** – tap any LCM cell to mark it for the warm accent tick
- **GlowSlider** – all sliders show a halo behind the thumb, scaling with the current value
- **Compact Track Layout** – each track fits in a single row (~44 px)
- **Preset Canvas** – 8 preset buttons (4/4, 3/4, 6/8, 5/4, 3:2, 4:3, 5:3, 7:4); tap to apply; **long-press (350 ms) to save the current full state** (BPM, beats, levels, accents, sounds, volumes) into that slot with an auto-generated label
- **Persistent Presets** – preset slots are saved to AsyncStorage and survive app restarts
- **Settings Sheet (⚙️)** – bottom sheet with: Sound selector A & B (Low/Mid/High button group), Karaoke toggle, Custom phrase editor (2–12 syllables)
- **Karaoke Phrase Bar** – funny English rhythm phrases synced to the polyrhythm union syllable count; CAPS for held syllables; scale + glow impulse on each beat; tap to cycle phrase; toggleable via 💬 button
- **Custom Karaoke Phrases** – define your own text per syllable count (2–12) in the Settings sheet; built-in phrases used when empty
- **Karaoke in Circle Center** – active syllable shown in the SVG center in Circle view
- **Single-Clock Engine** – all channels derive from one LCM-grid clock; drift-free by construction
- **Dark Theme** – mobile-first dark UI with safe-area support, 44 px touch targets, portrait & landscape layouts
- **Haptics** – medium impact on Play/Stop (expo-haptics)

---

## Getting Started

See [SETUP.md](SETUP.md) for full Windows setup instructions.

```powershell
npm install
npx expo start --web     # quick web preview
npx expo run:android     # native Android build
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native 0.83 + TypeScript | UI components & state |
| Expo SDK 55 | Build toolchain, haptics, status bar |
| react-native-audio-api ^0.11 | Native Web Audio API polyfill |
| @react-native-async-storage/async-storage | Persistent preset storage |
| react-native-svg | Circle Visualizer |
| react-native-reanimated | Animations |
| NativeWind (Tailwind) | Utility CSS classes |

---

## Project Structure

```
App.tsx                         # Root: layout, BPM, preset canvas, transport
src/
  audio/
    AudioEngine.ts              # LCM-grid scheduling engine (singleton)
  components/
    RhythmTrack.tsx             # Compact per-track control row
    PolyCanvas.tsx              # Mikroraster – LCM grid canvas
    CircleViz.tsx               # SVG polyrhythm circle visualizer
    KaraokeBar.tsx              # Karaoke phrase bar (Raster view)
    GlowSlider.tsx              # Reusable slider with animated halo
    SettingsSheet.tsx           # Bottom-sheet: sounds, karaoke, custom phrases
  hooks/
    useMetronome.ts             # React state & AudioEngine bridge + loadPreset
    useKaraokeSyllable.ts       # Union-beat mapping, phrase selection, flash timing
    usePresets.ts               # AsyncStorage preset persistence
  types/
    preset.ts                   # Preset interface
```

