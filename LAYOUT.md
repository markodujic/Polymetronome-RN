# Polymetronome RN – Layout-System

## Ziel
Die gesamte App ist **nicht-scrollbar**. Alle Sektionen passen immer auf den Bildschirm,
egal ob großes oder kleines Handy. Kein ScrollView im Portrait-Modus.

---

## Portrait-Layout: Flex-Verhältnisse

Die gesamte Bildschirmhöhe wird proportional auf 9 Sektionen aufgeteilt.  
Der Canvas (PolyCanvas/CircleViz + KaraokeBar) bekommt immer **45 %** der Höhe.

| # | Sektion | flex | ~600 px | ~780 px |
|---|---|---|---|---|
| 1 | headerRow (BPM + Logo) | 7 | 42 px | 55 px |
| 2 | bpmControls (Slider + ±) | 5 | 30 px | 39 px |
| 3 | presetRow (8 Slots) | 13 | 78 px | 101 px |
| 4 | RhythmTrack A | 5 | 30 px | 39 px |
| 5 | RhythmTrack B | 5 | 30 px | 39 px |
| 6 | viewToggle (Grid / Circle) | 4 | 24 px | 31 px |
| 7 | sliderGroup (Micro/Pulse/Hz) | 6 | 36 px | 47 px |
| 8 | **Canvas** | **45** | **270 px** | **351 px** |
| 9 | playBtnBar | 10 | 60 px | 78 px |
| **Σ** | | **100** | **600 px** | **780 px** |

---

## Scale-Faktor

```ts
const scale = Math.min(1, height / 780);
```

- `scale = 1.0` → normales Layout (≥ 780 px, z. B. Pixel 7)
- `scale = 0.85` → kompaktes Layout (ca. 660 px, z. B. iPhone SE 2nd gen)
- `scale = 0.77` → sehr kompaktes Layout (ca. 600 px, mini-Phones)

Ab `scale < 0.85` → **compact mode** aktiv.

---

## Responsive Anpassungen nach scale

| Element | Normal | Compact (scale < 0.85) |
|---|---|---|
| `bpmValue` fontSize | 44 | `Math.max(28, 44 * scale)` |
| `headerRow` paddingTop | 12 | `Math.max(4, 12 * scale)` |
| `playBtn` width/height | 68 | `Math.max(48, 68 * scale)` |
| `sliderGroup` paddingVertical | 6 | `Math.max(2, 6 * scale)` |
| `viewToggle` paddingVertical | 10 | `Math.max(4, 10 * scale)` |
| `presetRow` paddingVertical | 8 | `Math.max(3, 8 * scale)` |
| GlowSlider `sliderHeight` (BPM) | 40 | `Math.max(28, 40 * scale)` |
| GlowSlider `sliderHeight` (compact sliders) | 32 | `Math.max(22, 32 * scale)` |

### RhythmTrack — `compact` prop
```tsx
<RhythmTrack compact={scale < 0.85} ... />
```
- Normal: `paddingVertical: 6`, `stepBtn: 28×28`, `sliderHeight: 28`
- Compact: `paddingVertical: 3`, `stepBtn: 24×24`, `sliderHeight: 22`

### KaraokeBar — `height` prop
```tsx
<KaraokeBar height={Math.max(40, 64 * scale)} ... />
```
- Normal: 64 px
- Compact (scale 0.77): 49 px

---

## Landscape-Layout

Im Landscape-Modus bleibt das bisherige Zwei-Spalten-Layout erhalten:
- Linke Spalte (42 %): Controls mit ScrollView (hier ist Scrollen OK, da Querformat)
- Rechte Spalte (flex 1): Canvas

---

## Invarianten (werden nie verletzt)

- Canvas-Bereich immer ≥ 240 px Höhe
- Play-Button immer vollständig sichtbar
- Kein Element wird abgeschnitten (overflow: hidden nur auf Preset-Buttons)
- PolyCanvas `rowA = 1/3`, `rowB = 2/3` (wenn B focused), oder umgekehrt

---

## Implementierungs-Reihenfolge

1. **`App.tsx`** – ScrollView → View, flex-Gewichte, `scale` berechnen, dynamische Styles
2. **`src/components/RhythmTrack.tsx`** – `compact?: boolean` prop
3. **`src/components/KaraokeBar.tsx`** – `height?: number` prop (default: 64)
