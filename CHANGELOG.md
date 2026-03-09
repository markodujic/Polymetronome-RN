# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.4.0] – 2026-03-07

### Added
- **Karaoke Phrase Bar** – new `KaraokeBar` component rendered below the Mikroraster (Raster view only). Displays funny English rhythm phrases whose syllable count equals the union of all A+B beat positions in the LCM grid (e.g. 3:4 → 6 syllables). Held syllables (longest gap to next beat) are shown in CAPS. Phrases for syllable counts 1–16 are hardcoded; clicking cycles to the next phrase.
- **Karaoke in Circle Center** – in Circle view the active syllable is rendered as an SVG `<text>` element in the center of the circle (r < 52, inside Track B ring) with a `@keyframes center-pulse` flash in `#7dd3fc` on every beat.
- **Speech-bubble toggle** – single 💬 button, grayed out (`grayscale(1)`) when off, full-color when on; fixed position/size prevents layout shift on click.
- **`useKaraokeSyllable` hook** – shared hook encapsulating all karaoke logic: `_gcd`/`_lcm`, union-beat mapping, `longSyls` gap detection, phrase cycling, `activeSylIdx` tracking, `flashKey` remount trick. Used by both `KaraokeBar` and `CircleViz`.

### Changed
- `CircleViz` now accepts optional `karaokeOn` and `onToggleKaraoke` props; toggle button rendered as an absolutely-positioned DOM button over the SVG container.
- `KaraokeBar` simplified to a thin wrapper around `useKaraokeSyllable`.
- In Raster view `KaraokeBar` is rendered; in Circle view it is not mounted (no wasted hooks).

---

## [1.3.0] – 2026-03-07

### Added
- **Polyrhythm Circle Visualizer** – new `CircleViz` SVG component with two concentric annular rings (Track A outer r 100–138, Track B inner r 52–88); each ring is divided into N equal pie-slices matching the track’s beat count.
- **Comet-tail sweep** – a 6-segment sweep fills the current beat’s slice in real time using `requestAnimationFrame`; opacity grades from faint at the tail to full brightness at the head; sweep uses quadratic ease-in so it accelerates toward the next beat; color is light blue (`#7dd3fc`) for both tracks, matching the pulse/slider glow.
- **Accent gap ring** – a thin ring (`r 90–98`) sits in the 12 px gap between the two tracks and visualises micro-accent cells: marked cells glow blue, unmarked cells are nearly invisible.
- **View toggle** – two-button bar at the bottom of the controls column (⊞ Raster / ◎ Kreis); switches between the existing Mikroraster and the new Circle view; uses `.canvas-area` wrapper for seamless layout in both portrait and landscape.

### Changed
- `.canvas-area` wrapper introduced in portrait (`flex: 1`) and landscape (`grid-column: 2; grid-row: 2`) to host either view without layout changes.
- All pie-slices remain in track color at all times (orange for A, gold for B); no dimming of inactive beats.

---

## [1.2.4] – 2026-03-07

### Changed
- **Accent strip rectangular** – `.micro-row.row-accent` now uses `aspect-ratio: 2 / 1; min-height: 12px` instead of a fixed 8 px height; cells scale proportionally with grid column width for more reliable touch targets.
- **Landscape Play button full-area** – introduced `.left-col` wrapper around controls column and footer; in landscape the play button expands to fill all remaining space (`flex: 1; width: 100%; height: 100%; border-radius: 0`), flush with Track-B canvas above and screen edge below.
- **Landscape grid simplified** – reduced to 2 rows (`auto 1fr`); controls and footer now share one grid cell via `.left-col` flex column.

### Fixed
- **Landscape divider line removed** – removed `border-top` from `.app-footer` in landscape.
- **Portrait footer order preserved** – `.left-col { display: contents }` with `order: 5` on `.app-footer` keeps the play button at the very bottom in portrait.
- **Landscape play button CSS cascade** – moved landscape `.btn-play` overrides after the portrait base styles so the media-query rules actually win in the cascade (previously the later-declared portrait styles overwrote `border-radius: 0`, `min-height: 0`, etc.).

---

## [1.2.3] – 2026-03-07

### Changed
- **BPM +/− buttons round** – `border-radius: 50%` on `.btn-bpm-step` for circular appearance.
- **Polymetronome title into BPM section** – removed standalone `<header>` / `.app-header`; title now positioned absolute top-right inside `.bpm-section` via `.bpm-title`, reclaiming vertical space.
- **Info button** – small round `i` button positioned absolute top-left inside `.bpm-section` (placeholder for future Info / Privacy page).
- **Play button minimalist** – replaced full-width pill with a 56 px circle showing only ▶ / ⏹ icon, no text.
- **Beats controls centred** – `.beats-control` uses `position: absolute; left: 50%; transform: translateX(-50%)` so the ± controls are truly centred in the track header regardless of label / meta width.
- **Mute toggle on volume icons** – speaker emoji changed from `<span>` to `<button>` with click-to-mute; previous volume stored in a `useRef` and restored on unmute.
- **Micro volume default 50 %** – `volumeMicro` initial state changed from `0` to `0.5`.

### Fixed
- **Gap below BPM section** – removed `margin-bottom: 0.4rem` from `.bpm-section`.
- **Play symbol off-centre** – added `padding-left: 3px` to `.btn-play` to optically centre the ▶ glyph; reset to `0` in `.playing` state (⏹ is symmetric).
- **Landscape empty space above Play** – added `justify-content: flex-start` on `.app-controls-col` and `align-self: end` on `.app-footer` in landscape media query.

### Removed
- `.app-header` element and CSS rules (title moved into BPM section).

---

## [1.2.2] – 2026-03-06

### Changed
- **TAP button removed** – BPM slider moved inside `.bpm-controls` between the − and + buttons; streamlined BPM section with fewer controls.
- **Micro-click accent-only** – the micro-click channel now only plays on accented cells (`microAccents[gridPos] === true`). Unaccented cells are silent. Removed `tickBuffer` and `createTickBuffer()` (dead code). Only `accentTickBuffer` (2 kHz, 12 ms, amplitude 0.45) remains.
- **Play button blue** – active play state colour changed from red to light blue (`#7dd3fc`).
- **Canvas flex:1** – `PolyCanvas` uses `flex: 1; min-height: 0` to fill remaining vertical space instead of a fixed aspect ratio.
- **Safe-area top only** – removed bottom safe-area padding (`--safe-bottom` CSS variable removed); only top padding for camera notch retained.
- **Accent strip 8 px** – accent strip height reduced from 16 px to 8 px with `flex: 0 0 8px`; replaced `aspect-ratio: 1/1` with fixed height to prevent layout jumps during playback.
- **Slider group horizontal row** – Micro / Pulse / Hz sliders displayed as a horizontal row with `border-left` separators instead of vertical stack.
- **Responsive BPM** – BPM section uses `clamp()` for font-size and padding.

### Fixed
- **Micro-cell jumping during playback** – removed `flex 0.2s ease` transition from `.micro-row`; added `overflow: hidden` on `.micro-cell`; accent strip uses fixed height instead of `aspect-ratio`.
- **Landscape layout overhaul** – slider-group spans full width as top row; controls left, canvas right; play button bottom-left. BPM slider now visible in landscape (no longer hidden).

### Removed
- `tapTempo` callback and `tapTimesRef` from `useMetronome` destructuring in `App.tsx`.
- `.btn-tap` CSS rules (base + landscape).
- `tickBuffer` property and `createTickBuffer()` method from `AudioEngine`.

---

## [1.2.1] – 2026-03-05

### Changed
- **BPM section flat** – removed `border-radius` from `.bpm-section`, `.btn-bpm-step`, and `.btn-tap` for a sharp rectangular look consistent with the rest of the UI; removed side margin so BPM section spans full width.
- **Micro-grid cream tone** – empty micro-row backgrounds changed from dark grey (`--bg-secondary`) to a warm cream tint (`rgba(255, 243, 220, 0.08)`) for better visual warmth.
- **Label colour** – Micro, Pulse, and Hz labels now use `var(--accent)` (orange) matching the BPM value colour, instead of `var(--text-dim)`.
- **Pulse default 1600 Hz** – pulse oscillator default frequency changed from 330 Hz to 1600 Hz (one octave below `sine-high` 3200 Hz).
- **Hz slider range** – pulse frequency slider max increased from 1000 Hz to 5000 Hz; `setPulseFreq` clamp raised from 2000 to 5000.

---

## [1.2.0] – 2026-03-05

### Changed
- **GPU-composited slider glow** – replaced per-frame `box-shadow` with `calc()` on track pseudo-elements with a fixed pre-rendered `box-shadow` on a `.slider-glow-wrap::after` overlay whose `opacity` is driven by `--slider-val` and promoted to its own GPU layer via `will-change: opacity`. Eliminates full-paint on every slider pixel; only compositor-level opacity update remains.
- **Pulse sweep colour** – `.pulse-glow` elements between Track A beats now use light blue (`#7dd3fc` / `rgba(125, 211, 252, 0.7)`) instead of orange (`var(--accent)`) to match the slider glow colour scheme.

### Fixed
- **BPM slider jank** – `applyBpm` decoupled from `sync()`. Dragging the BPM slider now triggers only 1 `setState` + 1 `audioEngine.setMasterBpm()` instead of 3 setState calls + 2 object spreads per pixel. Track objects stay reference-stable during BPM drag.
- **Unnecessary re-renders** – `RhythmTrack` wrapped in `React.memo`; all callback props stabilised with `useCallback`; BPM display passed as lightweight `displayBpm` number prop instead of regenerating full track objects.
- **PolyCanvas re-renders on BPM drag** – custom `React.memo` comparator skips re-render when only `track.bpm` or `beatIntervalSec` changed (irrelevant to grid layout). Static cell data (`isA`, `isB`, `levelClass`) pre-computed via `useMemo`.
- **Duplicate CSS thumb rule** – removed second `::webkit-slider-thumb` / `::-moz-range-thumb` block in RhythmTrack.css that overrode light-blue with orange.
- **Beat-level-0 ghost flashes** – `fireBeat()` for Track B now gated on `beatLevel > 0`; silenced beats no longer trigger UI highlight.
- **State-updater side effects** – `toggleAccent` and `setSound` moved `audioEngine.updateTrack()` out of React state updaters to prevent double-invocation in Strict Mode.
- **Pulse active when muted** – `pulseActive` now also requires `volumeA > 0`.

---

## [1.1.0] – 2026-03-05

### Added
- **Landscape layout** – two-column CSS Grid layout when device is rotated (`orientation: landscape` + `max-height: 540px`): controls column (240 px, scrollable) on the left, Mikroraster filling the remaining space on the right; Play button anchored to the bottom of the controls column
- **Slider glow effect** – visible track line on all range sliders (BPM, Track volumes, Micro-click, Pulse tone); line colour is dark navy (`#1e4a6e`), glow colour is light blue (`rgba(125, 211, 252)`) with intensity proportional to the current value via `--slider-val` CSS custom property and `calc()` in `box-shadow`
- **PWA any-orientation** – `vite-plugin-pwa` manifest `orientation` changed from `portrait` to `any` so the installed PWA adapts to device rotation

### Changed
- **3 Sine sounds only** – `ClickSound` type simplified from 11 options to `'sine-low' | 'sine-mid' | 'sine-high'` (440 Hz / 880 Hz / 1760 Hz); all other synthesis methods removed
- **Portrait layout** – Mikroraster (PolyCanvas) now fills all remaining vertical space (`flex: 1`) between the controls and the Play button; Play button moved outside the controls column and anchored at the very bottom via a dedicated `.app-footer`
- **Slider labels** – emoji icons (🔔/🔕, 🎵/🔇, 🎹) removed from the Micro-click and Pulse sliders; plain text labels used instead

### Removed
- **Loop Mode** – entirely removed from all layers:
  - `loopRange` / `loopStart` state and `handleCellClick` / `clearLoop` handlers in `App`
  - Loop Controls JSX block (loop button + clear button)
  - `loopRange`, `loopStart`, `onCellClick` props on `PolyCanvas`
  - Loop class logic and all loop CSS (`in-loop`, `loop-bound`, `loop-pending`, `@keyframes loop-pulse`) in `PolyCanvas`
  - `loopRange` / `loopCells` private fields and `setLoopRange()` public method in `AudioEngine`
  - `setLoopRange` callback in `useMetronome`

### Fixed
- **Track B beat-level cycling** – `cycleBeatLevel` now reads from `trackBRef.current` directly instead of inside a React state updater, preventing React 18 Strict-Mode double-invocation from racing against `audioEngine.updateTrack()`
- **Stale beat levels after beat-count change** – `sync()` in `useMetronome` now resets `beatLevels` to a fresh `Array(beatsB).fill(1)` whenever `beatsB` changes

---

## [1.0.0] – 2026-03-04

### Added
- **Piercing Click** – Track A sine replaced with multi-frequency piercing click (2500/3200 Hz + overtones + noise transient) optimized for phone speakers
- **Pulse Tone** – rising OscillatorNode between Track A beats with configurable volume and frequency (50–1000 Hz); exponential gain ramp creates audible pendulum tension
- **Pulse Sweep Visualization** – orange glow elements sweep across Mikroraster row-a cells between beats with exponential intensity buildup; reset each beat via `key={activeBeatA}`
- **11 Click Sounds** – added Clave, Clap, Kick, Shaker, Tambourine, Marimba (all synthesized)
- **Sound Selector** – dropdown per track in `RhythmTrack` to choose from all 11 sounds
- **Pulse Pitch Slider** – 50–1000 Hz frequency control for the pulse tone
- **3-State Beat Levels (Track B)** – tap Track B beats in Mikroraster to cycle through 100% → 50% → 0% volume; visual opacity reflects volume state
- **Micro-Accent Layer** – tap any LCM grid cell in the accent strip to mark it as accented
  - Accented cells play a warm 2 kHz sine tick (12 ms, amplitude 0.45)
  - Un-accented cells play the quiet 4 kHz base tick
  - Accent strip height increased to 16px for better touch targets
  - `microAccents` state resets automatically when beat counts change
- **`AudioEngine.setMicroAccents(accents: boolean[])`** – new public method
- **`AudioEngine.setPulseFreq(hz)`** – control pulse oscillator frequency
- **`AudioEngine.schedulePulse()`** – schedules exponential gain ramp per beat interval

### Changed
- **Responsive no-scroll layout** – entire UI fits in 100dvh with `overflow: hidden`; compact BPM section, tracks, sliders, and play button; PolyCanvas fills remaining space with `flex: 1`
- **Flex-based grid rows** – row-a/row-b use CSS `flex` instead of fixed pixel heights for responsive sizing
- **Safe-area fix** – `body` gets `padding-top/bottom: env(safe-area-inset-*)` directly; `#root` and `.app` use `height: 100%` instead of `100dvh` so content correctly avoids notch/Dynamic Island area
- **Brighter inactive cells** – row-a, row-b, accent strip opacity increased to 0.75–0.8 for better visibility
- **Layout order** – PolyCanvas (Mikroraster) moved directly below BPM section, tracks below canvas

---

## [0.9.0] – 2026-03-04

### Added
- **PWA support** – app is now installable on mobile and desktop
  - `vite-plugin-pwa` with `autoUpdate` strategy
  - Workbox service worker with precaching (all assets cached for offline use)
  - `manifest.webmanifest` with app name, theme color, standalone display, portrait orientation
  - SVG icons (192×192, 512×512) with maskable support
  - `apple-touch-icon` for iOS home screen

---

## [0.8.0] – 2026-03-04

### Changed
- **Unified single-clock AudioEngine** – all three click channels (A, B, micro-click) now derive from ONE shared LCM-grid clock (`epoch + n × cellDuration`). Eliminates inter-track drift by construction – no independent BPM counters.
- **3 Volume sliders** – dedicated `GainNode` per channel (Track A, Track B, Micro-Click) with range inputs in the UI
  - Track A / B: inline slider in each `RhythmTrack` row
  - Micro-click: persistent slider bar between tracks and PolyCanvas
- `AudioEngine.start()` now takes a config object (`masterBpm`, `beatsA`, `beatsB`, sounds, accents) instead of an array of `MetronomeTrack`s
- `setMasterBpm()` replaces `reanchorTracks()` – proportional epoch re-anchoring
- `setBeats()` replaces `resyncAllTracks()` – hard resync to cell 0
- `setVolume(channel, value)` replaces `muted` property and micro-click toggle button
- Removed `addTrack()`, `removeTrack()`, per-track `ScheduledTrack` objects
- Derived BPM no longer uses `Math.round()` – displayed as exact fractional value
- Separate `activeBeatA` / `activeBeatB` state – simultaneous hits (same grid cell) now both light up in PolyCanvas
- `RhythmTrack` gains `volume` prop and `onVolume` callback

---

## [0.7.0] – 2026-03-04

### Removed
- **Übungsraster** (`PracticeRaster`) – beat isolation mode replaced by Loop Mode
  - Deleted `PracticeRaster.tsx` / `PracticeRaster.css`
  - Removed "Üben:" beat-selection buttons from `RhythmTrack`
  - Removed `practiceBeat` state, `onPracticeBeat` prop, and dimming logic from `PolyCanvas`

---

## [0.6.0] – 2026-03-04

### Added
- **Loop Mode** – tap two cells in the Mikroraster to define a loop range
  - Only beats within the selected LCM-grid range are played
  - Audio loops the shortened excerpt (not a full cycle with muting)
  - Loop range highlighted with orange background; start/end cells get solid orange border
  - Pending first-cell selection shown with dashed pulsing border
  - "🔁 Loop aus" button deactivates loop; beats/track changes auto-clear loop
- **Micro-Click** – toggleable metronome tick on every LCM grid cell (one click per micro-pulse)
  - Synthesized 4 kHz sine tick (8 ms, volume 0.15)
  - Runs as Track id=99, always started with A/B (muted until toggled)
  - "🔔 Tick an / 🔕 Tick aus" button in loop bar
- **`addTrack()` / `removeTrack()`** methods in `AudioEngine` for hot-adding tracks during playback

### Changed
- **Epoch-based timing** in `AudioEngine.advanceBeat()` – beat times computed as `epochTime + n × interval` instead of accumulated `+=`, eliminating long-running float drift
- **`reanchorTracks(oldBpm, newBpm)`** – proportional time scaling on BPM slider change prevents inter-track click drift
- **`resyncAllTracks()`** – hard resync to beat 0 on structural changes (beats ±)
- Loop visuals: no dimming of outside-loop cells; loop range gets subtle orange background + brighter beats inside
- `PolyCanvas` cells are now clickable (`onCellClick` prop)
- `useMetronome` exposes `updateMicroClick(enabled)` and `setLoopRange()`
- `sync()` in `useMetronome` detects BPM vs beats changes and calls `reanchorTracks` or `resyncAllTracks` accordingly

---

## [0.5.0] – 2026-03-03

### Added
- **Übungsraster** (`PracticeRaster`) – beat isolation training mode
  - Tap a numbered beat button (1 … N) on the focused track to activate
  - Shows the full reference track (other pattern) as an upper row
  - Shows only the selected beat of the focused track as a single narrow bar below
  - Fractional position label: e.g. `+2/5 nach Zählzeit 1` – shows exactly how far into the reference cycle the practised beat falls
  - Deactivate by tapping the same button again or switching focused track
- Beat-selection buttons (1 … N) appear inside `RhythmTrack` when that track is focused
- `practiceBeat: number | null` state in `App` – resets automatically when focused track changes or beat count is reduced below the selected beat
- In `PolyCanvas` Mikroraster: non-selected beats of the focused track are dimmed to `opacity: 0.1` during practice mode for visual focus

### Changed
- `RhythmTrack` gains optional props `practiceBeat`, `onPracticeBeat`
- `PolyCanvas` gains optional prop `practiceBeat`
- `App.selectTrack()` helper resets `practiceBeat` on track switch

---

## [0.4.0] – 2026-03-03

### Added
- **Mikroraster** (`PolyCanvas`) – combined LCM grid showing both tracks in one horizontal band
  - Track A row (orange) on top, Track B row (yellow) below
  - Grid size = LCM(beatsA, beatsB)
  - Active cell glows in sync with audio output
- **Focus Mode** – tap A or B label to enlarge that track's row (52 px vs 20 px, animated 0.2 s)
- `focusedTrack: 'A' | 'B'` state in `App`, passed as CSS variables `--height-a` / `--height-b`

### Changed
- Removed per-track `BeatVisualizer`; replaced with unified `PolyCanvas`
- `RhythmTrack` is now a pure control row (label button + beat stepper + BPM/badge)
- beat dots replaced by rectangular cells

---

## [0.3.0] – 2026-03-03

### Added
- **True Polyrhythm** – Track B BPM derived from `bpmA × beatsB / beatsA`
- `derivedBpm()` helper and `sync()` in `useMetronome`
- "Tempo" / "abgeleitet" badges in `RhythmTrack` header
- `PolyCanvas` component (initially with `BeatRow`, later simplified to Mikroraster)

### Changed
- Simplification from n-track to 2 fixed tracks
- Fixed `AudioContext` autoplay policy
- Fixed `tapTempo` stale reference bug
- Beat dots replaced with full-width grid rectangles

---

## [0.2.0] – 2026-03-03

### Added
- 5 synthesized click sounds: Sine, Wood Block, Rimshot, Hi-Hat, Cowbell
- Per-track volume slider
- Mobile PWA meta tags

### Fixed
- `AudioEngine.scheduleNote` crash
- Missing `volume`/`sound` defaults
- Per-track `GainNode` routing

### Changed
- Mobile-first redesign: 44 px touch targets, 100dvh, safe-area

---

## [0.1.0] – 2026-03-03

### Added
- Initial release
- Web Audio API look-ahead scheduler (25 ms / 100 ms)
- Tap tempo, beat accent toggle, dark theme
