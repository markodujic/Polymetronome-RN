# AudioEngine

`src/audio/AudioEngine.ts` – singleton Web Audio API engine.

---

## Design

### Single-Clock Architecture

All three click channels (A, B, micro-click) are driven from **ONE shared LCM-grid clock**.
There are no independent BPM counters or per-track schedulers – everything derives from a
single `epoch + n × cellDuration` formula.  This eliminates inter-track drift by construction.

```
cellDuration = (beatsA × 60) / (masterBpm × gridSize)

For LCM cell n:
  time = epoch + n × cellDuration
  gridPos = n % gridSize
  
  if gridPos % stepA === 0 → play Track A sound
  if gridPos % stepB === 0 → play Track B sound
  always                   → play micro-click (if volume > 0)
```

### Scheduling-Ahead Pattern

- A polling loop runs every **25 ms**
- Each iteration schedules all cells that fall within the next **100 ms** window
- This decouples audio scheduling from the browser rendering pipeline

```
Scheduler loop (every 25ms)
  └── while cellTime < now + 100ms:
        determine gridPos
        if Track A hits: schedule A sound, fire callback
        if Track B hits: schedule B sound, fire callback
        if micro volume > 0: schedule tick
        cellsFromEpoch++
```

### Volume Signal Chain

Each channel has a **dedicated GainNode**. Volume changes take effect instantly
without rescheduling – just adjust the gain value.

```
BufferSource (A)    → gainA     (0–1)  ─┐
Oscillator (pulse)  → gainPulse (0–1)  ─┤  (pulse routed through gainA)
BufferSource (B)    → gainB     (0–1)  ─┼→ masterGain (0.8) → destination
BufferSource (tick) → gainMicro (0–1)  ─┘
```

---

## API

### `audioEngine.init(): Promise<void>`
Creates the `AudioContext`, resumes it (required by browser autoplay policy),
sets up master and per-channel gain nodes, and synthesizes all sound buffers.
**Must be called before `start()`.**

### `audioEngine.start(config): void`
Starts playback from cell 0.

```ts
audioEngine.start({
  masterBpm: 120,
  beatsA: 3,  beatsB: 4,
  soundA: 'sine-high',  soundB: 'sine-low',
  accentsA: [true, false, false],
  accentsB: [true, false, false, false],
});
```

### `audioEngine.stop(): void`
Stops playback. Also cancels all pending `fireBeat` setTimeout callbacks to prevent stale state updates after unmount/dispose.

### `audioEngine.setMasterBpm(bpm: number): void`
Live BPM change during playback. Proportionally scales remaining time to the
next cell and re-anchors the epoch so the rhythm doesn't skip or stutter.

### `audioEngine.setBeats(beatsA, beatsB, accentsA, accentsB): void`
Structural change (beat counts). Recomputes gridSize, stepA, stepB. Hard resync
to cell 0 if playing.

### `audioEngine.updateTrack(track: MetronomeTrack): void`
Hot-swaps sound and accent config for a track (by `track.id`). Used for accent toggling.

### `audioEngine.setVolume(channel: 'A' | 'B' | 'micro' | 'pulse', value: number): void`
Sets the gain for a channel (0–1). Volume 0 = muted (no audio is scheduled).

### `audioEngine.setPulseFreq(hz: number): void`
Sets the pulse oscillator frequency (50–5000 Hz, default 1600). Takes effect on the next scheduled pulse.

### `audioEngine.setMicroAccents(accents: boolean[]): void`
Sets per-cell accent flags for the LCM grid. Length must equal `gridSize = LCM(beatsA, beatsB)`.
Only flagged cells produce a micro-click sound (`accentTickBuffer`: 2 kHz, 12 ms, amplitude 0.45). Unflagged cells are silent.
Can be called at any time – takes effect within the next scheduler interval (25 ms).

### `audioEngine.setOnBeat(callback: BeatCallback): void`
Registers a callback fired (with visual-accurate delay) for each scheduled beat.

```ts
type BeatCallback = (beatIndex: number, time: number, trackId: number) => void;
```

### `audioEngine.playing: boolean`
Read-only getter for current play state.

### `audioEngine.dispose(): void`
Stops playback and closes the `AudioContext`.

---

## Step-Scheduler (Step-Modus)

Wenn `viewMode === 'step'` aktiv ist, ersetzt der Step-Scheduler den LCM-Grid-Scheduler vollständig.

### Warum ein separater Scheduler?

Der LCM-Grid-Scheduler rechnet mit ganzzahligen Gitterpositionen. Triolen erzeugen
irrationale Zeitpositionen (z.B. `1/3` eines Beats), die nicht auf das LCM-Grid passen.
Der Step-Scheduler arbeitet mit Fraktionen (0–1) pro Beat und ist unabhängig vom LCM.

### Cursor-Ansatz

Statt eines Tag-Caches (`Set<string>`) verwendet der Step-Scheduler einen monoton wachsenden Zeiger
(`stepCursorA`, `stepCursorB`) auf eine vorsortierte Flat-Liste aller Ereignisse innerhalb einer Wiedergabe-Zyklusrunde.

```
recomputeStepFlat():
  stepFlatA = flattenPattern(patternA) → [{frac, beatIdx}, …] sortiert nach frac
  stepFlatB = flattenPattern(patternB) → [{frac, beatIdx}, …] sortiert nach frac

stepScheduler() (läuft parallel zum LCM-Scheduler, 25 ms Polling):
  für track A und B:
    while stepCursor < stepFlat.length:
      frac = beatIdx + offset   (absolute Position im Zyklus, 0 … beatsA-1+1)
      t = epoch + cycle * cycleDur + frac * beatDurA
      wenn t > now + SCHEDULE_AHEAD_TIME → break
      wenn t >= now → scheduleSound(t); fireBeat(...)
      cursor++
    wenn cursor >= length → cursor auf 0 zurücksetzen, cycle++
```

**Vorteil:** Jedes Ereignis wird genau einmal geplant. Kein Cache-Reset → kein Doppel-Scheduling.

### Neue Felder (AudioEngine)

| Feld | Typ | Beschreibung |
|---|---|---|
| `stepFlatA` | `{frac: number; beatIdx: number}[]` | Vorsortierte Ereignisliste Track A |
| `stepFlatB` | `{frac: number; beatIdx: number}[]` | Vorsortierte Ereignisliste Track B |
| `stepCursorA` | `number` | Aktueller Zeiger in stepFlatA |
| `stepCursorB` | `number` | Aktueller Zeiger in stepFlatB |

### `audioEngine.setStepEvents(trackId: 1 | 2, events: number[][]): void`

Setzt die Step-Ereignisse für einen Track. Wird von App.tsx aufgerufen wenn sich das `StepPattern` ändert oder die Wiedergabe startet.

- `events[beatIndex]` = Array von Offsets (0–1) innerhalb dieses Beats
- Beispiel: `[[0], [0, 0.5], [0, 0.333, 0.666]]` → Beat 0 = ganzer Schlag, Beat 1 = zwei 8tel, Beat 2 = Triole
- Ruft intern `recomputeStepFlat()` auf und setzt `stepCursorA/B` zurück

```ts
audioEngine.setStepEvents(1, [[0], [0, 0.5], [0, 0.333, 0.667]]);
audioEngine.setStepEvents(2, [[0, 0.25, 0.5, 0.75]]);
```

---

## Sound Synthesis

All sounds are synthesized at init-time into `AudioBuffer` objects.
**No audio files are loaded.**

| Sound | Method | Description |
|---|---|---|
| `sine-low` | `createPiercingClick(880)` | Low sine click – 880 Hz |
| `sine-mid` | `createPiercingClick(1760)` | Mid sine click – 1760 Hz |
| `sine-high` | `createPiercingClick(3200)` | High sine click – 3200 Hz |
| `tick-accent` | `createAccentTickBuffer` | 2 kHz sine, 12 ms, amplitude 0.45 – accent micro-click (only sound used for micro-clicks) |

All track sounds use `createPiercingClick(hz)` which synthesizes a short sine burst at
the given frequency. Each sound has a **normal** and an **accent** variant (accent = slightly
higher amplitude).

The **pulse tone** is a live OscillatorNode (not a buffer) whose gain ramps exponentially
between Track A beats, creating a rising tension effect.

The micro-click now operates in **accent-only mode**: only cells flagged via `setMicroAccents()` produce sound (using the `accentTickBuffer`). Unflagged cells are silent – the base `tickBuffer` has been removed.

---

## Timing Details

```
SCHEDULE_AHEAD_TIME = 0.1 s   (look-ahead window)
SCHEDULER_INTERVAL  = 25 ms   (polling interval)
```

Cell duration:

```
cycleDuration = beatsA × 60 / masterBpm
cellDuration  = cycleDuration / gridSize
```

Timing is **epoch-based**: `cellTime = epoch + cellsFromEpoch × cellDuration`.
No floating-point accumulation – each time is a single multiplication.

### BPM change

```
remaining   = (epoch + cells × oldDuration) − now
scaled      = remaining × (newDuration / oldDuration)
epoch_new   = now + scaled − cells × newDuration
```
