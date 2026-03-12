# Polymetronome RN – Layout-System

## Ziel
Die gesamte App ist **nicht-scrollbar**. Alle Sektionen passen immer auf den Bildschirm,
egal ob großes oder kleines Handy. Kein ScrollView im Portrait-Modus.

---

## Portrait-Layout: Flex-Verhältnisse

Die gesamte Bildschirmhöhe wird proportional auf 9 Sektionen aufgeteilt.  
Der Canvas (PolyCanvas/CircleViz) bekommt immer **flex: 1** (alle verbleibende Höhe nach fixen Controls).  
Die KaraokeBar ist eine **eigene Sektion** außerhalb des Canvas, damit der Canvas immer stabil bleibt.

**Implementierung:** Controls haben intrinsische Höhe (kein flex), Canvas nimmt den Rest via `flex: 1`.

| # | Sektion | Höhe | Bemerkung |
|---|---|---|---|
| 1 | headerRow (BPM + Logo) | intrinsisch, skaliert | paddingTop/paddingBottom skaliert |
| 2 | bpmControls (Slider + ±) | intrinsisch, skaliert | sliderHeight skaliert |
| 3 | presetRow (8 Slots) | intrinsisch, skaliert | paddingVertical skaliert |
| 4 | RhythmTrack A | intrinsisch, compact | compact={scale < 0.85} |
| 5 | RhythmTrack B | intrinsisch, compact | compact={scale < 0.85} |
| 6 | viewToggle (Grid / Circle) | intrinsisch, skaliert | paddingVertical skaliert |
| 7 | sliderGroup (Micro/Pulse/Hz) | intrinsisch, skaliert | paddingVertical + sliderHeight skaliert |
| 8 | **Canvas** (`canvasWrapper`) | **flex: 1** | nimmt ALLE verbleibende Höhe |
| 9 | KaraokeBar | `max(36, 64*scale)` px | nur in Raster-Mode + karaokeOn; sonst height: 0 |
| 10 | playBtnBar | intrinsisch, skaliert | paddingVertical + playBtn-Größe skaliert |

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

| Element | Normal | Compact (scale < 0.85) / skaliert |
|---|---|---|
| `bpmValue` fontSize | 44 | `max(28, round(44 * scale))` |
| `headerRow` paddingTop | 12 | `max(4, round(12 * scale))` |
| `headerRow` paddingBottom | 4 | `max(2, round(4 * scale))` |
| `bpmStepBtn` width/height | 36 | `max(28, round(36 * scale))` |
| `GlowSlider` sliderHeight (BPM) | 40 | `max(28, round(40 * scale))` |
| `presetCanvas` paddingVertical | 8 | `max(4, round(8 * scale))` |
| `viewBtn` paddingVertical | 10 | `max(4, round(10 * scale))` |
| `sliderGroup` paddingVertical | 6 | `max(2, round(6 * scale))` |
| `GlowSlider` sliderHeight (compact sliders) | 32 | `max(22, round(32 * scale))` |
| `KaraokeBar` height | 64 | `max(36, round(64 * scale))` |
| `playBtn` width/height | 68 | `max(48, round(68 * scale))` |
| `playBtnBar` paddingVertical | 12 | `max(6, round(12 * scale))` |

### RhythmTrack — `compact` prop
```tsx
<RhythmTrack compact={scale < 0.85} ... />
```
- Normal: `paddingVertical: 6`, `labelBtn: 32×32`, `stepBtn: 28×28`, `sliderHeight: 28`
- Compact: `paddingVertical: 3`, `labelBtn: 26×26`, `stepBtn: 24×24`, `sliderHeight: 22`

### KaraokeBar — außerhalb des Canvas, height-gesteuert
```tsx
const karaokeBarH = (viewMode === 'raster' && karaokeOn) ? Math.max(36, Math.round(64 * scale)) : 0;
<View style={{ height: karaokeBarH, overflow: 'hidden' }}>
  <KaraokeBar ... />
</View>
```
- KaraokeBar selbst bleibt unverändert (height: 64 intern)
- Der Wrapper kollabiert zu 0 wenn karaoke aus oder circle-view aktiv

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

1. **`App.tsx`** ✅ – ScrollView entfernt, `scale`/`compact` berechnet, dynamische Styles, KaraokeBar ausgelagert
2. **`src/components/RhythmTrack.tsx`** ✅ – `compact?: boolean` prop + compact-Styles
3. **`src/components/KaraokeBar.tsx`** – keine Änderung nötig (Höhe via Wrapper in App.tsx)
