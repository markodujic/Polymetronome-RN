# Step-Sequencer – Konzept & Architektur

## Überblick
Dritter View-Modus (`'step'`) neben `'polygrid'` und `'circle'`.
Interaktiver Step-Sequencer mit dynamischer, rekursiver Subdivision pro Zelle.
`'raster'` wurde im Zuge der Step-Integration zu `'polygrid'` umbenannt.

## UI-Aufbau
- **2 Reihen**: Track A (oben, orange `#ff6b35`), Track B (unten, gelb `#e8aa14`)
- **Grundzellen**: Track A hat `beatsA` Zellen, Track B hat `beatsB` Zellen
- **Kein Design/Play-Toggle** – StepView ist immer editierbar (entfernt in v1.9.0)
- **Reset-Button** (oben rechts) – setzt beide Patterns auf `makeDefaultPattern(beats)` zurück
- KaraokeBar wird auch im Step-Modus angezeigt (wie im Polygrid-Modus)

## Rekursives Datenmodell (`src/types/stepPattern.ts`)

```ts
interface StepNode {
  id: string;                 // eindeutig für React-Keys
  active: boolean;            // spielt? (nur Blätter relevant)
  subdivision: 2 | 3 | null;  // null = Blatt; 2 = binär (÷2); 3 = Triole (÷3)
  children: StepNode[];       // leer wenn Blatt
}

interface TrackStepPattern {
  nodes: StepNode[];          // Länge = beatsA bzw. beatsB
}
```

Tiefenlimit: **3 Ebenen** (4tel → 8tel → 16tel → max).
Triolen auf jeder Ebene möglich (z.B. 8tel-Triole, 16tel-Triole).

## Subdivision-Beispiele
```
4tel (Blatt, active)
4tel ÷2 → [8tel, 8tel]
4tel ÷3 → [Triole × 3]
8tel ÷2 → [16tel, 16tel]
8tel ÷3 → [8tel-Triole × 3]
16tel ÷3 → [16tel-Triole × 3]
```

## Interaktion (immer aktiv, kein Edit-Mode erforderlich)

| Geste | Wirkung |
|---|---|
| Kurz tippen auf Blatt | active toggle (an/aus) |
| Lang drücken auf Blatt | SubdivPicker öffnen |
| SubdivPicker ÷2 / ÷3 | Subdivision einfügen (nur bei `depth < 3`) |
| SubdivPicker ↩ Aufheben | Übergeordneten Knoten zurück zum Blatt (nur bei `depth > 0`) |
| Reset-Button | Beide Patterns auf Standardwert zurücksetzen |

## SubdivPicker – Depth-Tracking

Der `picker`-State enthält `{ path: number[], trackId: 1 | 2, depth: number }`.

- `depth` = Tiefe des gedrückten Knotens im Baum (0 = Grundschlag, 1 = erste Subdivision, usw.)
- SubdivPicker zeigt ÷2/÷3 nur wenn `depth < 3`
- SubdivPicker zeigt „↩ Aufheben" nur wenn `depth > 0` (Collapse auf übergeordneten Knoten)

## Flattening-Algorithmus (Scheduling)

Rekursive Auflösung eines Baums in eine flache Liste von Zeitoffsets (0–1) innerhalb eines Beats:

```
flattenNode(node, startFrac, durationFrac) → [{offset: number}]
  wenn Blatt:
    wenn active → yield { offset: startFrac }
  sonst:
    subDur = durationFrac / node.subdivision
    für i, child in node.children:
      flattenNode(child, startFrac + i * subDur, subDur)
```

Absolutzeit: `epoch + beat * beatDuration + offset * beatDuration`

## AudioEngine-Erweiterung (`src/audio/AudioEngine.ts`)

### Cursor-Ansatz (seit v1.9.0 – ersetzt Tag-Cache)

Statt eines periodisch geleerten `Set<string>` wird ein monotoner Cursor verwendet.
`recomputeStepFlat()` baut vorsortierte Flat-Listen aus den `stepEventsA/B`.
`stepScheduler()` läuft mit `stepCursorA/B` durch die Listen — jedes Ereignis exakt einmal.

### Methode: `setStepEvents(trackId: 1 | 2, events: number[][])`
- `events[beatIndex]` = Array von Offsets (0–1) innerhalb dieses Beats
- Beispiel: `[[0], [0, 0.5], [0, 0.333, 0.666]]` für Beat 0 = ganzer Schlag, Beat 1 = zwei 8tel, Beat 2 = Triole
- Ruft intern `recomputeStepFlat()` auf + setzt Cursor zurück

### Warum separater Scheduler?
Der LCM-Grid-Scheduler rechnet mit ganzzahligen Gitterpositionen. Triolen erzeugen
irrationale Zeitpositionen (z.B. `1/3` eines Beats), die nicht auf das LCM-Grid passen.

**Lösung**: Step-Scheduler ersetzt den LCM-Grid-Scheduler komplett wenn `'step'`-Modus aktiv ist.
Kein Parallel-Betrieb beider Scheduler.

## Preset-Integration (seit v1.9.0)

- `Preset` enthält optionale Felder `stepPatternA?: TrackStepPattern` und `stepPatternB?: TrackStepPattern`
- `handleSaveToSlot` in App.tsx inkludiert Step-Patterns nur wenn `viewMode === 'step'`
- Beim Laden eines Presets: `if (p.stepPatternA) setStepPatternA(p.stepPatternA)`

## Wichtige Dateien
| Datei | Zweck |
|---|---|
| `src/types/stepPattern.ts` | StepNode + TrackStepPattern Typen + Hilfsfunktionen |
| `src/components/StepView.tsx` | UI-Komponente (immer editierbar, Reset-Button) |
| `src/audio/AudioEngine.ts` | `setStepEvents()` + Cursor-basierter Step-Scheduler |
| `src/types/preset.ts` | `stepPatternA?` + `stepPatternB?` Felder |
| `App.tsx` | viewMode `'step'`, StepPattern-State, Preset save/load |

## Status
- [x] `src/types/stepPattern.ts` erstellen
- [x] AudioEngine `setStepEvents()` + Step-Scheduler implementieren
- [x] Step-Scheduler von Tag-Cache auf Cursor-Ansatz umgestellt (kein Doppel-Scheduling)
- [x] `StepView.tsx` – Baum-Rendering + Interaktion (immer editierbar)
- [x] Rekursive Subdivision bis Tiefe 3 mit SubdivPicker Depth-Tracking + Collapse
- [x] Design/Play-Toggle entfernt → Reset-Button
- [x] Chrome Context-Menu Fix (onContextMenu preventDefault, Web only)
- [x] App.tsx Integration (`'raster'` → `'polygrid'`, dritter Button)
- [x] Preset save/load für Step-Patterns


## Rekursives Datenmodell (`src/types/stepPattern.ts`)

```ts
interface StepNode {
  id: string;                 // eindeutig für React-Keys
  active: boolean;            // spielt? (nur Blätter relevant)
  subdivision: 2 | 3 | null;  // null = Blatt; 2 = binär (÷2); 3 = Triole (÷3)
  children: StepNode[];       // leer wenn Blatt
}

interface TrackStepPattern {
  nodes: StepNode[];          // Länge = beatsA bzw. beatsB
}
```

Tiefenlimit: **3 Ebenen** (4tel → 8tel → 16tel → max).
Triolen auf jeder Ebene möglich (z.B. 8tel-Triole, 16tel-Triole).

## Subdivision-Beispiele
```
4tel (Blatt, active)
4tel ÷2 → [8tel, 8tel]
4tel ÷3 → [Triole × 3]
8tel ÷2 → [16tel, 16tel]
8tel ÷3 → [8tel-Triole × 3]
16tel ÷3 → [16tel-Triole × 3]
```

## Design-Modus Interaktion
| Geste | Wirkung |
|---|---|
| Kurz tippen auf Blatt | active toggle (an/aus) |
| Lang drücken auf Blatt | Subdivision-Picker öffnen (÷2 / ÷3) |
| Lang drücken auf unterteilten Knoten | Unterteilung aufheben (zurück zu Blatt) |

## Flattening-Algorithmus (Scheduling)

Rekursive Auflösung eines Baums in eine flache Liste von Zeitoffsets (0–1) innerhalb eines Beats:

```
flattenNode(node, startFrac, durationFrac) → [{offset: number}]
  wenn Blatt:
    wenn active → yield { offset: startFrac }
  sonst:
    subDur = durationFrac / node.subdivision
    für i, child in node.children:
      flattenNode(child, startFrac + i * subDur, subDur)
```

Absolutzeit: `epoch + beat * beatDuration + offset * beatDuration`

## AudioEngine-Erweiterung (`src/audio/AudioEngine.ts`)

### Neue Methode: `setStepEvents(trackId: 1 | 2, events: number[][])`
- `events[beatIndex]` = Array von Offsets (0–1) innerhalb dieses Beats
- Beispiel: `[[0], [0, 0.5], [0, 0.333, 0.666]]` für Beat 0 = ganzer Schlag, Beat 1 = zwei 8tel, Beat 2 = Triole

### Warum separater Scheduler?
Der LCM-Grid-Scheduler rechnet mit ganzzahligen Gitterpositionen. Triolen erzeugen
irrationale Zeitpositionen (z.B. `1/3` eines Beats), die nicht auf das LCM-Grid passen.

**Lösung**: Step-Scheduler ersetzt den LCM-Grid-Scheduler komplett wenn `'step'`-Modus aktiv ist.
Kein Parallel-Betrieb beider Scheduler.

### Scheduler-Logik im Step-Modus
```
für jede scheduled Beat-Position (beat i, Track A oder B):
  für jeden Offset in stepEvents[trackId][i]:
    absoluteTime = epoch + (i + offset) * beatDuration
    wenn absoluteTime ∈ [now, now + SCHEDULE_AHEAD_TIME]:
      playSound(...)
      fireBeat(trackId, i, absoluteTime)
```

## Wichtige Dateien
| Datei | Zweck |
|---|---|
| `src/types/stepPattern.ts` | StepNode + TrackStepPattern Typen (neu) |
| `src/components/StepView.tsx` | UI-Komponente (neu) |
| `src/audio/AudioEngine.ts` | Erweiterung um `setStepEvents()` |
| `App.tsx` | viewMode `'step'`, State für StepPattern A+B |

## Implementierungs-Reihenfolge
1. `src/types/stepPattern.ts` — Typen + Hilfsfunktionen (`makeDefaultPattern`, `flattenPattern`)
2. `AudioEngine.ts` — `setStepEvents()` + Step-Scheduler-Modus
3. `src/components/StepView.tsx` — Design-Modus (Baum-Rendering + Interaktion)
4. `src/components/StepView.tsx` — Play-Modus (Flash-Animationen)
5. `App.tsx` — viewMode `'step'`, StepPattern-State, `'raster'` → `'polygrid'`

## Status
- [x] `src/types/stepPattern.ts` erstellen
- [x] AudioEngine `setStepEvents()` + Step-Scheduler implementieren
- [x] `StepView.tsx` Design-Modus
- [x] `StepView.tsx` Play-Modus
- [x] App.tsx Integration (`'raster'` → `'polygrid'`, dritter Button)
