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
- **Toolbar** (unten) ersetzt im Step-Modus die MICRO/PULSE/HZ-Slider durch 5 Drag-and-Drop-Tool-Buttons
- KaraokeBar wird im Step-Modus **ausgeblendet** (seit v1.9.1)
- A/B-Beschriftungsfelder in den Beat-Reihen **entfernt** (seit v1.9.2)

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

## Drag-and-Drop Toolbar (seit v1.9.2)

Im Step-Modus wird die untere Slider-Zeile durch eine Toolbar mit 5 Tool-Buttons ersetzt.
Jeder Button lässt sich per Drag-and-Drop auf eine Beat-Zelle (oder Sub-Zelle) ziehen.

### Verfügbare Tools

| Button | Label | Wirkung |
|---|---|---|
| 1 | ÷3 | Teilt Ziel-Blatt in 3 gleiche Kinder (`subdivideNode(n, 3)`) |
| 2 | ÷3 – | Triole mit deaktiviertem Mittelkind (`children[1].active = false`) |
| 3 | ×4 | Zwei binäre Ebenen → 4 Blätter (`subdivideNode(n,2)`, Kinder jeweils `×2`) |
| 4 | Btn 4 | (reserviert, kein Effekt) |
| 5 | Btn 5 | (reserviert, kein Effekt) |

### Technische Umsetzung

**PanResponder (App.tsx)**
- 5 `PanResponder`-Instanzen in `useMemo([], [])`, je einer pro Button
- Button-View bekommt `{...panResponder.panHandlers}`
- `dragState: { tool: string; gx: number; gy: number } | null` steuert Ghost
- Ghost-Element im Root-`SafeAreaView`: `position: 'absolute'`, `zIndex: 9999`, `pointerEvents="none"`
- Bei `onPanResponderRelease`: `stepViewRef.current?.hitTest(gx, gy)` → `applyDragToolRef.current(tool, trackId, path)`

**StepViewHandle (StepView.tsx)**
```typescript
export interface StepViewHandle {
  hitTest(x: number, y: number): { trackId: 1 | 2; path: number[] } | null;
}
```
`StepView` ist ein `forwardRef`-Component; `useImperativeHandle` exponiert `hitTest`.

**Layout-Cache (`LeafEntry[]`)**
```typescript
type LeafEntry = { path: number[]; rect: { x: number; y: number; w: number; h: number } };
```
- Jede sichtbare Blatt-Zelle (`NodeCell`) registriert sich beim Eltern-`StepView` via `onLeafMount(path, ref)`
- Damit das Rect korrekt ist, wird `useRef` + `onLayout`-Callback verwendet (`ref`-Callback feuert *vor* dem Layout)
- `registerLeaf` filtert Stale-Einträge: Präfix-Einträge (Eltern-Knoten des neuen Blattes) werden herausgelöscht
- `w === 0 && h === 0`-Guard: nicht montierte Rects werden ignoriert

**applyDragTool (App.tsx)**
```typescript
applyDragToolRef.current = (tool, trackId, path) => {
  const applyLeaf = (n: StepNode): StepNode => { /* tool-spezifische Subdivision */ };
  if (trackId === 1) setStepPatternA(prev => ({ nodes: updateNode(prev.nodes, path, applyLeaf) }));
  else setStepPatternB(prev => ({ nodes: updateNode(prev.nodes, path, applyLeaf) }));
};
```
`updateNode` traversiert den Baum entlang `path` und wendet `applyLeaf` nur auf den Zielknoten an.

### Web-Kompatibilität
- `userSelect: 'none'` + `cursor: 'grab'` im `stepToolBtn`-Style (nur Web)
- `selectable={false}` auf Button-Labels verhindert Textmarkierung beim Ziehen

---

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
- [x] KaraokeBar im Step-Modus ausgeblendet (v1.9.1)
- [x] Step-Presets (eigene 8 Slots für Step-Modus, v1.9.1)
- [x] Audio-Bug bei BPM-Änderung im Step-Modus behoben (v1.9.2)
- [x] Drag-and-Drop Toolbar (5 Tool-Buttons, PanResponder, Ghost, v1.9.2)
- [x] Pfad-basierter Leaf-Hit-Test in StepView (LeafEntry[], onLayout-Timing, v1.9.2)
- [x] Tool-Pattern ÷3, ÷3–, ×4 über Drag-and-Drop anwendbar (v1.9.2)
- [x] A/B-Beschriftungsfelder aus StepView entfernt (v1.9.2)


