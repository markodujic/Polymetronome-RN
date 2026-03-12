# TODO

## Planned Features

### High Priority
- [x] **PWA / installable app** – `vite-plugin-pwa` with manifest, service worker, offline caching
- [x] **Micro-Accent Layer** – tap LCM cells to place accent ticks, for ear-training against polyrhythm ambiguity
- [x] **Sound selector per track** – simplified to 3 sine tones: Low (440 Hz), Mid (880 Hz), High (1760 Hz)
- [x] **Pulse tone** – rising oscillator between Track A beats with volume and frequency control
- [x] **3-state beat levels** – per-beat volume toggle (100%/50%/0%) for Track B
- [x] **Responsive no-scroll layout** – fits 100dvh, safe-area support
- [x] **Preset system** – save and load polyrhythm configurations; save mode via ✎ button (replaces long-press for web compatibility)
- [x] **Preset canvas** – 8 one-tap hardcoded presets (4/4, 3/4, 6/8, 5/4, 3:2, 4:3, 5:3, 7:4) set BPM + both beat counts; mini-grid preview shows stored pattern

### Medium Priority
- [ ] **Metronome swing** – swing/shuffle percentage slider for Track A
- [ ] **Tempo ramp** – gradually increase BPM over a set number of bars
- [ ] **Measure counter** – display the current measure number during playback
- [x] **Haptic feedback** – `Haptics.notificationAsync(Success)` beim Speichern eines Presets
- [x] **Visual pendulum / circle visualizer** – Circle view with two concentric rings, comet-tail sweep, accent gap ring, toggleable via ⊞/◎ button
- [x] **Karaoke phrase display** – funny English phrases synced to union-beat grid; CAPS for held syllables; 💬 toggle; shown in Raster bar and in Circle center
- [x] **Landscape layout** – two-column CSS Grid layout when phone is rotated

### Low Priority
- [ ] **MIDI output** – send MIDI clock via Web MIDI API
- [ ] **Custom sound upload** – import a short WAV/MP3 as click sound
- [ ] **Light theme** – optional light color scheme

---

## Known Issues

- [ ] On iOS Safari, rapid double-taps on the Play button can occasionally produce a delayed first beat
- [ ] At very high BPM (>240) with large beat counts the LCM grid in `PolyCanvas` can become very dense (e.g. 5:7 = 35 cells) and individual cells visually very narrow on small screens

### Android UI (nächste Session)
- [ ] **Preset-Button Rundungen fehlen (Android)** – `gap` in `flexWrap`-Container wird auf Android ignoriert; `margin`-Ansatz + `overflow: hidden` zeigt noch keinen Effekt; BorderRadius-Clipping auf nativer Ebene prüfen
- [ ] **Slider-Bereich (MICRO / PULSE / HZ) durch PolyCanvas verdeckt** – `backgroundColor: BG2` auf `sliderGroup` hat den Layering-Bug auf Android nicht behoben; z-Index / Reihenfolge der Views prüfen

---

## Recently Fixed (1.9.0)

- [x] **Step-Sequencer vollständig implementiert** – viewMode `'step'`, StepView.tsx, StepPattern-Typen, AudioEngine Step-Scheduler
- [x] **Rekursive Subdivision bis Tiefe 3** – SubdivPicker mit Depth-Tracking; ÷2/÷3 nur bei depth < 3; ↩ Aufheben bei depth > 0
- [x] **Step-Scheduler Doppel-Scheduling** – Tag-Cache ersetzt durch Cursor-Ansatz (stepCursorA/B)
- [x] **Design/Play-Toggle entfernt** – StepView immer editierbar; Reset-Button stattdessen
- [x] **Step-Patterns in Presets** – `stepPatternA/B` werden beim Speichern im Step-Modus übernommen und beim Laden wiederhergestellt
- [x] **Chrome Context-Menu bei Long-Press** – `onContextMenu: e.preventDefault()` auf NodeCell (Web only)

## Recently Fixed (1.8.0)

- [x] **Preset save-mode zeigt Zahlen** – PresetMiniGrid bleibt immer sichtbar, Save-Mode nur durch gelben Glow-Rand signalisiert
- [x] **Preset save-Feedback** – grüner Haken ersetzt durch Glow-Impuls + Haptics.notificationAsync
- [x] **PresetMiniGrid nicht lesbar** – Ratio-Text 9→13 px; Dots auf proportionales LCM-Timeline-Layout umgestellt
- [x] **CircleViz abgeschnitten** – `onLayout`-basiertes `vizSize` statt fester Schätzung
- [x] **Web-Animationswarnungen** – `useNativeDriver` plattformabhängig; `shadow*` → `Platform.select`

## Recently Fixed (1.7.0)

- [x] **Preset save broken on web** – `onLongPress` doesn't fire with mouse; replaced with ✎ edit-mode button
- [x] **Preset buttons cluttered** – replaced text label + ratio text with dot-grid mini-preview + ratio header
- [x] **CircleViz karaoke font mismatch** – replaced `SvgText` with RN `Text` overlay
- [x] **CircleViz karaoke no pulse** – added identical scale + glow animation as in KaraokeBar
- [x] **CircleViz responder prop warnings** – removed `onPress` from `<G>`, use `Pressable` overlay instead
- [x] **Web deprecation warnings** – `textShadow*`, `pointerEvents` prop, `shadow*` props

## Recently Fixed (1.6.1)

- [x] **KaraokeBar native crash** – `Animated.parallel` mixed `useNativeDriver` values; split into separate calls
- [x] **Duplicate karaoke flash on coincident beats** – 30 ms debounce via `lastFlashMsRef`
- [x] **`accentsB` not persisted in presets** – added to `Preset` type, save, load
- [x] **`fireBeat` callbacks after dispose** – pending timers now cleared in `stop()`

---

## Done

- [x] Fix `AudioEngine.scheduleNote` crash (missing `accentBuffer` / `clickBuffer`)
- [x] Add all sound synthesis methods (`createNoiseClick`, `createHiHatBuffer`, `createCowbellBuffer`)
- [x] Mobile-first redesign with 44 px touch targets
- [x] PWA viewport meta tags and safe-area insets
- [x] Correct per-track `GainNode` routing through `masterGain`
- [x] Fix `AudioContext` autoplay policy (resume on Play press, not on mount)
- [x] Fix `tapTempo` stale reference bug
- [x] Simplify to 2 fixed tracks (remove n-track UI)
- [x] True polyrhythm: derive Track B BPM from `bpmA × beatsB / beatsA`
- [x] Replace circular beat dots with full-width rectangles
- [x] Mikroraster (`PolyCanvas`) – single LCM grid for both tracks
- [x] Focus Mode – enlarge selected track row in Mikroraster
- [x] Micro-Click – Tick auf jeder LCM-Zelle mit Volume-Slider
- [x] Single-Clock Engine – alle 3 Kanäle aus einem LCM-Grid-Taktgeber
- [x] 3 Volume-Slider (Track A, Track B, Micro-Click)
- [x] `setMasterBpm` / `setBeats` statt `reanchorTracks` / `resyncAllTracks`
- [x] Micro-Accent Layer – Per-Zelle Akzente im LCM-Grid
- [x] Piercing Click – durchdringender Klick für Handylautsprecher
- [x] Pulse Tone – anschwellender Sinuston zwischen Track-A-Schlägen
- [x] Pulse Sweep Visualization – glühende Zellen wandern durch das Raster
- [x] 11 Sounds – Clave, Clap, Kick, Shaker, Tambourine, Marimba hinzugefügt
- [x] Sound Selector – Dropdown pro Track
- [x] Pulse Pitch Slider – Frequenz 50–5000 Hz
- [x] 3-State Beat Levels – Pro-Beat-Lautstärke für Track B (100%/50%/0%)
- [x] Responsive no-scroll Layout – 100dvh, kein Scrollen, Safe-Area
- [x] Landscape Layout – CSS Grid zwei Spalten, Mikroraster rechts, Controls+Footer links
- [x] Portrait Layout – PolyCanvas `flex: 1` mittig, Play-Button immer ganz unten
- [x] Slider Glow – dunkle Linie + hellblauer Glow via `--slider-val` CSS Custom Property
- [x] 3 Sine Sounds – vereinfacht auf Low/Mid/High (880/1760/3200 Hz), alle anderen Sounds entfernt
- [x] Loop Mode entfernt – vollständig aus allen 6 Dateien entfernt
- [x] Fix: Track-B Beat-Level-Cycling (React-18-Strict-Mode Race Condition)
- [x] Fix: Stale `beatLevels` nach Beat-Count-Änderung
- [x] GPU-Composited Slider Glow – `opacity` statt per-frame `box-shadow` mit `calc()`
- [x] BPM-Slider entkoppelt von `sync()` – 1 setState statt 3 beim Schieben
- [x] React.memo für RhythmTrack + PolyCanvas mit Custom Comparator
- [x] Pulse-Sweep hellblau (`#7dd3fc`) statt orange (`var(--accent)`)
- [x] Fix: Duplicate CSS Thumb Rule, fireBeat für stille Beats, State-Updater Side Effects
- [x] BPM-Section flat – border-radius entfernt, volle Breite
- [x] Micro-Grid Cremeton – leere Zellen warm statt dunkelgrau
- [x] Label-Farbe – Micro/Pulse/Hz Labels in `var(--accent)` statt `var(--text-dim)`
- [x] Pulse Default 1600 Hz (Oktave unter sine-high 3200 Hz)
- [x] Hz-Slider bis 5000 Hz, Clamp auf 5000
- [x] RhythmTrack kompakt – alle Controls in einer Zeile (~44 px)
- [x] GlowSlider – Halo-Kreis hinter Thumb, Opacity skaliert mit Sliderwert
- [x] Preset Canvas – 8 Voreinstellungs-Buttons (4/4, 3/4, 6/8, 5/4, 3:2, 4:3, 5:3, 7:4)
- [x] Play-Button bei aktiv in Hellblau (#7dd3fc) statt Grün
- [x] Beat-1-Farben: kein Weiß mehr, A-Zeile orange / B-Zeile gold
- [x] KaraokeBar Impuls-Effekt: Scale 1.25→1 + #7dd3fc Glow (300 ms)
- [x] Einstellungszahnrad (⚙️) rechts in der Play-Bar
- [x] Web Audio Support (createAudioContext Factory)
- [x] TAP-Button entfernt – BPM-Slider zwischen − und + Buttons
- [x] BPM +/− Buttons rund (`border-radius: 50%`)
- [x] Schwarzen Spalt unter BPM-Section entfernt (`margin: 0`)
- [x] Schriftzug „Polymetronome“ in BPM-Section rechts oben, Header entfernt
- [x] Info-Button „i“ links oben in BPM-Section (Placeholder)
- [x] Mute-Toggle auf Lautsprecher-Icons (Track A & B)
- [x] Beats-Controls (±) zentriert via `position: absolute`
- [x] Play-Button minimalistisch – runder Kreis, nur ▶/⏹
- [x] Micro Volume Default 50 %
- [x] Play-Symbol optisch zentriert (`padding-left: 3px`)
- [x] Landscape: leerer Bereich über Play-Button behoben
- [x] Accent-Strip rechteckig – `aspect-ratio: 2/1`, `min-height: 12px` für bessere Touch-Targets
- [x] Landscape Play-Button füllt verbleibenden Platz (`.left-col`-Wrapper, `flex: 1`, kein border-radius)
- [x] Landscape Trennlinie über Play-Button entfernt
- [x] Landscape Grid auf 2 Rows vereinfacht
- [x] Micro-Click accent-only – nur akzentuierte Zellen spielen Sound
- [x] Play-Button blau (#7dd3fc) statt rot bei Aktivierung
- [x] Canvas flex:1 – füllt verbleibenden Platz
- [x] Safe-Area nur oben (Bottom-Padding entfernt)
- [x] Akzentstreifen 8px fest (kein aspect-ratio, kein Layout-Sprung)
- [x] Slider-Gruppe horizontal (Micro/Pulse/Hz als Reihe)
- [x] CSS-Kaskaden-Fix – Landscape `.btn-play` Overrides nach Portrait-Basis-Styles verschoben
- [x] Polyrhythm Circle Visualizer – SVG, zwei Ringe, Kuchenstück-Sweep (hellblau, ease-in quadratic)
- [x] Cometsweif – 6 Segmente, Opacity-Gradient, Glow am Kopf
- [x] Akzent-Spalt-Ring – LCM-Zellen zwischen A- und B-Ring visualisiert
- [x] View-Toggle – ⊞ Raster / ◎ Kreis Button in Controls-Column
- [x] Fix: Micro-Zellen springen nicht mehr bei Playback
- [x] Landscape-Layout komplett überarbeitet

