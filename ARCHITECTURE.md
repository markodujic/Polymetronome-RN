# Architecture

## Overview

Polymetronome follows a simple unidirectional data flow:

```
useMetronome (hook)
  ├── AudioEngine (singleton)   ← schedules audio ahead of time
  └── React state               ← drives UI re-renders
        └── App
              ├── RhythmTrack (A – master)
              ├── RhythmTrack (B – derived)
              ├── PolyCanvas (Mikroraster)
              ├── CircleViz (Circle Visualizer + karaoke center text)
              │     └── useKaraokeSyllable (shared hook)
              └── KaraokeBar (Raster view karaoke bar)
                    └── useKaraokeSyllable (shared hook)
```

---

## Component Tree

### `App`
Root component. Holds `focusedTrack: 'A' | 'B'` state (which track is visually enlarged).

**State from `useMetronome`:**

| Value | Type | Description |
|---|---|---|
| `bpm` | `number` | Master BPM (Track A) |
| `trackA` | `MetronomeTrack` | Master track (uses `bpm` directly) |
| `trackB` | `MetronomeTrack` | Derived track (`bpm = masterBpm × beatsB / beatsA`) |
| `isPlaying` | `boolean` | Global play state |
| `activeBeatA` | `number \| null` | Currently playing beat index for Track A |
| `activeBeatB` | `number \| null` | Currently playing beat index for Track B |
| `volumeA` | `number` | Track A volume (0–1) |
| `volumeB` | `number` | Track B volume (0–1) |
| `volumeMicro` | `number` | Micro-click volume (0–1) |
| `volumePulse` | `number` | Pulse tone volume (0–1) |
| `pulseFreq` | `number` | Pulse tone frequency in Hz (50–5000, default 1600) |
| `microAccents` | `boolean[]` | Per-cell accent flags for the LCM grid (length = LCM(beatsA, beatsB)) |
| `toggle` | `() => void` | Start / stop |
| `applyBpm` | `(bpm: number) => void` | Set master BPM + re-derive Track B |
| `setBeats` | `(trackId, beats) => void` | Change beat count + re-derive Track B |
| `toggleAccent` | `(trackId, beatIndex) => void` | Flip accent on a beat |
| `cycleBeatLevel` | `(beatIndex) => void` | Cycle Track B beat through 100% → 50% → 0% |
| `tapTempo` | `() => void` | Register a tap for BPM calculation |
| `changeVolume` | `(ch, val) => void` | Set volume for A, B, micro, or pulse |
| `toggleMicroAccent` | `(cellIndex: number) => void` | Toggle accent on a single LCM grid cell |
| `setSound` | `(trackId, sound) => void` | Change click sound for a track |
| `setPulseFreq` | `(hz: number) => void` | Set pulse tone frequency |

**Local state in `App`:**
| Value | Type | Description |
|---|---|---|
| `focusedTrack` | `'A' \| 'B'` | Which track is visually enlarged |
| `viewMode` | `'raster' \| 'circle'` | Toggle between Mikroraster and Circle view |
| `karaokeOn` | `boolean` | Whether karaoke syllable display is active |

---

### `RhythmTrack`
Control row for one track:
- Label button (A / B) – pressing it switches `focusedTrack` in `App`
- Beat stepper (− / count / +)
- BPM display + “Tempo” or “abgeleitet” badge
- Volume slider (0–100%) with dark-navy track and light-blue glow (intensity proportional to value)
- Sound selector dropdown (3 sine sounds: Low / Mid / High)

Props: `label`, `track`, `isMaster`, `isSelected`, `volume`, `displayBpm`, `onSelect`, `onBeats`, `onVolume`, `onMute`, `onSound`

---

### `PolyCanvas`
The single combined Mikroraster. Replaces separate per-track visualizers.

**Layout per grid column:**
```
┌─────────┐
│  row A  │  ← flex: --flex-a (3 if focused, 1 otherwise)
│ (pulse) │  ← pulse glow elements sweep between A beats
├─────────┤
│  accent │  ← accent strip (aspect-ratio: 2/1, min-height: 12px), tappable per cell
├─────────┤
│  row B  │  ← flex: --flex-b
└─────────┘
```

The accent strip is independent of the track rows. Tapping a cell in the strip calls `onMicroAccentToggle(i)` with `stopPropagation` so it does not interfere with Loop-Mode cell selection.

Grid size = LCM(beatsA, beatsB). Each column represents one unit in the LCM grid.

**Pulse Sweep:** When `pulseActive` is true and playback is running, `<div className="pulse-glow">` elements appear inside row-a cells between the current and next A beat. Each one fades in with a staggered `animation-delay` proportional to its position in the beat interval; intensity follows `pos^1.5` for exponential build-up. The `key={activeBeatA}` prop forces re-mount on each beat, restarting all animations.

**3-State Beat Levels (Track B):** Clicking on a Track B hit cell cycles through `beat-level-100` → `beat-level-50` → `beat-level-0`, applying opacity changes and adjusting audio volume per beat.

**Cell colours:**
| State | Colour |
|---|---|
| Track A schlägt hier | `--accent` (orange) |
| Track B schlägt hier | `--accent-secondary` (yellow) |
| Beide gleichzeitig | weiß |
| Kein Schlag | `--bg-secondary` (dunkel) |
| Aktiv (gerade gespielt) | leuchtet auf |

Receives `focusedTrack: 'A' | 'B'` and sets `--flex-a` / `--flex-b` CSS variables accordingly. Transition is animated (0.2 s ease).

Props: `trackA`, `trackB`, `activeBeatA`, `activeBeatB`, `isPlaying`, `focusedTrack`, `microAccents`, `onMicroAccentToggle`, `onBeatBClick`, `pulseActive`, `beatIntervalSec`

---

### `CircleViz`
SVG-based polyrhythm visualizer with two concentric annular rings (Track A outer, Track B inner), comet-tail sweep animation, and an accent gap ring.

When `karaokeOn` is true, displays the active karaoke syllable as a `<text>` element in the center of the circle with a pulse animation. A 💬 toggle button is rendered as an absolutely-positioned DOM button over the SVG container.

Props: `trackA`, `trackB`, `activeBeatA`, `activeBeatB`, `isPlaying`, `beatIntervalSec`, `microAccents`, `karaokeOn?`, `onToggleKaraoke?`

---

### `KaraokeBar`
Standalone karaoke bar rendered below the Mikroraster (Raster view only). Thin wrapper around `useKaraokeSyllable` hook. Shows the current syllable with a pulse animation on each beat. Toggle button (💬) to enable/disable.

Props: `trackA`, `trackB`, `activeBeatA`, `activeBeatB`, `isPlaying`, `karaokeOn`, `onToggleKaraoke`

---

### `useKaraokeSyllable` (hook)
Shared hook encapsulating all karaoke logic. Computes the union of Track A and Track B beat positions in the LCM grid, maps each union position to a syllable index, detects long syllables (CAPS), manages phrase selection/cycling, tracks active syllable index, and provides a `flashKey` for animation remounting.

Used by both `CircleViz` and `KaraokeBar`.

Returns: `{ text, typeCls, isLong, isActive, flashKey, cyclePhrase, phraseCount }`

---

## Polyrhythm Engine

### BPM Derivation

Track A is always the master. Track B's BPM is derived so both complete their full beat cycle in exactly the same wall-clock duration:

$$bpm_B = bpm_A \times \frac{beats_B}{beats_A}$$

```ts
function derivedBpm(masterBpm: number, beatsA: number, beatsB: number): number {
  return (masterBpm * beatsB) / beatsA; // exact, no rounding
}
```

`sync()` in `useMetronome` calls this whenever `bpm`, `beatsA`, or `beatsB` changes.
The derived BPM is for **display only** – the AudioEngine computes timing from the master BPM and the LCM grid directly.

---

## State Management

All state lives in the `useMetronome` hook. No external state library is used.

```
useState: bpm          – master BPM number
useState: trackA       – MetronomeTrack (master)
useState: trackB       – MetronomeTrack (derived)
useState: isPlaying    – boolean
useState: activeBeatA  – number | null (Track A’s last beat)
useState: activeBeatB  – number | null (Track B’s last beat)
useState: volumeA      – number 0–1
useState: volumeB      – number 0–1
useState: volumeMicro  – number 0–1
useState: volumePulse  – number 0–1
useState: pulseFreq    – number 50–5000 (Hz)
useRef:   bpmRef       – always-current snapshot for callbacks
useRef:   trackARef    – always-current snapshot
useRef:   trackBRef    – always-current snapshot
```

---

## Data Types

```ts
interface MetronomeTrack {
  id: number;
  bpm: number;           // 20–300
  beats: number;         // 1–16
  subdivision: number;   // always 1 in current UI
  accents: boolean[];    // length === beats
  beatLevels: number[];  // per-beat volume (1.0 | 0.5 | 0.0)
  muted: boolean;
  volume: number;        // 0–1
  sound: ClickSound;     // 'sine-low' (880 Hz) | 'sine-mid' (1760 Hz) | 'sine-high' (3200 Hz)
}
```

---

## Layout

### Portrait (default)

```
┌──────────────────┐
│  app-controls-col │  flex-shrink: 0
│  (BPM section,    │
│   tracks)         │
├──────────────────┤
│  slider-group     │  Micro / Pulse / Hz (horizontal row)
│  (flex-direction: │
│   row)            │
├──────────────────┤
│   PolyCanvas      │  flex: 1  (fills remaining space)
├──────────────────┤
│   app-footer      │  flex-shrink: 0
│   [Play button]   │
└──────────────────┘
```

### Landscape (`orientation: landscape` + `max-height: 540px`)

```
┌─────────────────────────────────────────┐
│          slider-group (full width)      │  grid-row: 1; grid-column: 1 / -1
│  Micro │ Pulse │ Hz                     │
├──────────────┬──────────────────────────┤
│ .left-col    │                          │
│ ┌──────────┐ │                          │
│ │controls  │ │      PolyCanvas          │
│ │ (BPM,    │ │                          │
│ │ tracks)  │ │                          │
│ ├──────────┤ │                          │
│ │ ▶ full   │ │                          │
│ │ area     │ │                          │
│ └──────────┘ │                          │
├──────────────┤                      │
│ app-footer   │                      │
│ [▶ full area]│                      │
└──────────────┴──────────────────────┘
  220px fixed          1fr
```

CSS Grid: `grid-template-columns: 220px 1fr`, `grid-template-rows: auto 1fr`.
Slider-group spans full width as a top row; `.left-col` wraps `app-controls-col` + `app-footer` as a flex column in grid-row 2.
Play button fills all remaining space below controls (`flex: 1; border-radius: 0`).

### Slider Glow

Each slider is wrapped in a `.slider-glow-wrap` div that receives `--slider-val` (0–1) as an inline CSS custom property. The wrapper’s `::after` pseudo-element carries a **fixed, pre-rendered** `box-shadow` glow and uses `opacity: var(--slider-val)` with `will-change: opacity` to promote it to its own GPU compositor layer:

```css
.slider-glow-wrap::after {
  box-shadow: 0 0 14px 3px rgba(125, 211, 252, 0.9); /* never changes */
  opacity: var(--slider-val, 0);                       /* only this changes */
  will-change: opacity;                                /* own GPU layer */
}
```

This avoids per-frame `box-shadow` recalculation (full paint) and reduces slider interaction to a cheap compositor-only opacity update.

Track background is dark navy (`#1e4a6e`); glow colour is light blue (`#7dd3fc`).

---

## Audio / UI Synchronization

The `AudioEngine` schedules notes ahead of time (100 ms look-ahead window).
For each scheduled note it fires a `setTimeout` with the precise delay until that
note plays. That callback triggers `setActiveBeatA` / `setActiveBeatB` in React,
keeping the visual Mikroraster highlight tightly aligned with actual audio output.
Both tracks can be active simultaneously (e.g. when A and B share a grid cell).

```
Audio thread  ──schedules──►  note at T+100ms
                               │
                               └──► setTimeout(delay = T+100ms - now)
                                          │
                                          └──► setActiveBeatA/B(beatIndex)
                                                    │
                                                    └──► PolyCanvas re-renders active cell
```
