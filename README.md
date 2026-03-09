# Polymetronome

A **polyrhythmic metronome mobile web app** for musicians who want to practise complex polyrhythms against a steady pulse.

> Optimized for mobile – runs directly in the browser on any smartphone without installation.

---

## Features

- **2-Track Polyrhythm** – fixed Track A (master tempo) and Track B (derived tempo)
- **Automatic BPM Derivation** – both tracks always finish their cycle in the same wall-clock time (`bpmB = bpmA × beatsB / beatsA`)
- **Precise Audio** – Web Audio API with look-ahead scheduling for sample-accurate timing
- **3 Sine Click Sounds** – Low (880 Hz), Mid (1760 Hz), High (3200 Hz); all synthesized, no audio files
- **Sound Selector** – dropdown per track to choose Low / Mid / High
- **Pulse Tone** – rising sine oscillator between Track A beats with configurable frequency (50–5000 Hz) and volume; creates an audible "pendulum" tension building toward each beat
- **Pulse Sweep Visualization** – light-blue glow cells sweep across the Mikroraster between A beats, intensity rising exponentially like a pendulum
- **3-State Beat Levels** – tap Track B beats in the Mikroraster to cycle through 100% → 50% → 0% volume per beat
- **Beats 1–16** – adjustable beat count per track
- **Accent Patterns** – tap beat rectangles to toggle accents
- **Mikroraster** – visual kgV grid (LCM of both beat counts); shows exactly where each pattern's beats fall relative to the other
- **Focus Mode** – tap the track label (A / B) to enlarge that track's row in the Mikroraster
- **Micro-Click** – volume slider for accent ticks in the LCM grid; only accented cells produce sound (accent-only mode)
- **Micro-Accents** – tap any cell in the accent strip between the two track rows to mark it; only marked cells play the warm 2 kHz accent tick
- **5 Sliders** – Track A volume, Track B volume, Micro-Click volume, Pulse volume, Pulse pitch (Hz)
- **Mute Toggle** – tap the speaker icon on any track to mute / unmute
- **Minimalist Play Button** – 56 px circle (▶ / ⏹) in portrait; full-area rectangle in landscape
- **Single-Clock Engine** – all channels derive from one LCM-grid clock; drift-free by construction
- **Mobile-First UI** – responsive no-scroll layout fitting 100dvh, safe-area support for notch/Dynamic Island phones, dark theme, 44 px touch targets; landscape two-column layout available when rotated
- **Slider Glow** – range sliders show a dark-navy track line with a light-blue glow whose intensity scales with the current value
- **PWA** – installable on home screen, works offline (service worker with precaching)
- **Karaoke Phrase Bar** – funny English rhythm phrases synced to the polyrhythm; syllable count equals the union of both tracks' beat positions in the LCM grid; held syllables displayed in CAPS; toggleable via a speech-bubble button; visible in Raster view
- **Karaoke in Circle Center** – in Circle view the active syllable is displayed in the center of the SVG circle with a light-blue pulse flash on each beat; toggle button bottom-left

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.  
On mobile (same WiFi): `npm run dev -- --host`

## Build for Production

```bash
npm run build
npm run preview
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI components & state |
| Vite | Build tool & dev server |
| Web Audio API | Synthesized click sounds, sample-accurate timing |
| CSS Custom Properties | Theming & dark mode |

---

## Project Structure

```
src/
  audio/
    AudioEngine.ts           # Web Audio scheduling engine (singleton)
  components/
    RhythmTrack.tsx/.css     # Per-track control row
    PolyCanvas.tsx/.css      # Mikroraster – combined LCM grid
    CircleViz.tsx/.css       # Polyrhythm Circle Visualizer (SVG concentric rings)
    KaraokeBar.tsx/.css      # Karaoke phrase bar (Raster view)
    BeatVisualizer.tsx/.css  # (unused in main UI, kept for reference)
    TrackPanel.tsx/.css      # (legacy, not used in App)
  hooks/
    useMetronome.ts          # React state & AudioEngine bridge
    useKaraokeSyllable.ts    # Shared hook: union-beat mapping, phrase selection, flash timing
  App.tsx / App.css          # Root layout, BPM section, transport
  index.css                  # Global mobile-first base styles
```

---

## Documentation

| File | Description |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Component tree, data flow, state management |
| [AUDIO_ENGINE.md](AUDIO_ENGINE.md) | AudioEngine API, sound synthesis, timing details |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, coding conventions, PR guide |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
