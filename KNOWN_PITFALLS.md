# Known Pitfalls – Polymetronome RN

Dokumentierte Fehler, die während der Entwicklung aufgetreten sind.
**Vor jeder größeren Änderung hier nachschlagen.**

---

## 1. `ref`-Callback feuert vor dem Layout (React Native)

**Problem:** Ein `ref`-Callback (z.B. `ref={node => { node?.measureInWindow(...) }}`) wird aufgerufen, bevor das Layout tatsächlich berechnet wurde. `measureInWindow` liefert dann `x=0, y=0, w=0, h=0`.

**Aufgetreten bei:** `NodeCell` in `StepView.tsx` – Leaf-Layout-Cache für `hitTest` war leer.

**Lösung:**
```tsx
// FALSCH – ref-Callback feuert vor Layout
ref={node => { node?.measureInWindow(cb); }}

// RICHTIG – useRef + onLayout
const nodeRef = useRef<any>(null);
<TouchableOpacity
  ref={nodeRef}
  onLayout={() => {
    nodeRef.current?.measureInWindow((x, y, w, h) => { ... });
  }}
/>
```

---

## 2. `useRef` / Hook vor Early-Return (Hook Rules)

**Problem:** In Memo-/forwardRef-Komponenten mit bedingtem `return` wurde `useRef` nach dem Early-Return platziert → React Hook Rules Violation (`Hooks dürfen nicht nach bedingten Rückgaben aufgerufen werden`).

**Aufgetreten bei:** `NodeCell` in `StepView.tsx` – `useRef` wurde nach `if (node.subdivision !== null) return <...>` gesetzt.

**Lösung:** Alle `useRef`/`useState`/`useEffect`-Aufrufe **immer vor** jedem Early-Return platzieren, auch wenn der Ref im Early-Return-Zweig nicht verwendet wird.

---

## 3. Stale Eltern-Einträge im Layout-Cache nach Subdivision

**Problem:** Wenn ein Blatt-Knoten unterteilt wird, registrieren sich die neuen Kind-Knoten im Cache – aber der alte Eltern-Eintrag (z.B. Pfad `[0]`) bleibt erhalten. `hitTest` trifft den Elterneintrag zuerst (er liegt über den Kindern), die Kinder sind nie erreichbar.

**Aufgetreten bei:** `registerLeafA/B` in `StepView.tsx`.

**Lösung:** Beim Eintragen eines neuen Blatts alle Einträge herausfiltern, deren Pfad ein Präfix des neuen Pfades ist, **und** den neuen Pfad selbst:
```typescript
const eKey = path.join(',');
cache = cache.filter(e => {
  const k = e.path.join(',');
  return k !== eKey && !eKey.startsWith(k + ',');
});
if (w > 0 && h > 0) cache.push({ path, rect: { x, y, w, h } });
```

---

## 4. BPM-Änderung stoppt Audio im Step-Modus

**Problem:** `AudioEngine.setMasterBpm` verwendete `cellDuration` und `cellsFromEpoch` (LCM-Grid-Arithmetik) um die Epoch neu zu berechnen. Im Step-Modus existiert kein LCM-Grid → Events landeten alle in der Vergangenheit → `stepCursorA/B` rasten durch die gesamte Liste → Stille für den Rest des Zyklus.

**Aufgetreten bei:** `AudioEngine.ts` – `setMasterBpm`.

**Lösung:** Separaten `isStepMode`-Branch mit beat-duration-basierter Cycle-Skalierung:
```typescript
if (this.isStepMode) {
  const oldCycleDur = this.beatsA * (60 / this.masterBpm);
  this.masterBpm = newBpm;
  this.recalcGrid();
  const newCycleDur = this.beatsA * (60 / this.masterBpm);
  const elapsed = Math.max(0, now - this.epoch);
  const cycleNum = Math.floor(elapsed / oldCycleDur);
  const posInCycle = elapsed - cycleNum * oldCycleDur;
  this.epoch = now - cycleNum * newCycleDur - posInCycle * (newCycleDur / oldCycleDur);
  this.stepCursorA = 0;
  this.stepCursorB = 0;
  return;
}
```

---

## 5. Textmarkierung beim Drag (Web)

**Problem:** Bei `PanResponder`-Drag auf Web wird der Text innerhalb des gezogenen Elements vom Browser selektiert (blaue Markierung), was die UX ruiniert.

**Aufgetreten bei:** Toolbar-Buttons in `App.tsx` (Step-Modus Drag-and-Drop).

**Lösung:**
```tsx
// Auf dem Button-View (Web-Style):
style={{ userSelect: 'none', cursor: 'grab' } as any}

// Auf dem Text-Element:
<Text selectable={false}>÷3</Text>
```

---

## 6. `shadow*`-Props auf `overflow: hidden`-View

**Problem:** `shadowColor`, `shadowOpacity` usw. auf einer View mit `overflow: 'hidden'` haben keinen Effekt (Shadow wird abgeschnitten). Auf Android fehlt der Shadow komplett.

**Aufgetreten bei:** Preset-Buttons, Glow-Animationen.

**Lösung:** Shadow immer auf ein **äußeres** `Animated.View` ohne `overflow: hidden` legen; das innere View (mit `borderRadius` + `overflow: hidden`) dient nur dem Clipping.

---

## 7. `useNativeDriver: true` auf Web

**Problem:** `useNativeDriver: true` in Animated-Konfigurationen wirft auf der Web-Plattform eine Warnung/Fehler, da der native Treiber im Web nicht verfügbar ist.

**Aufgetreten bei:** `KaraokeBar`, `CircleViz`, `PolyCanvas`, `SettingsSheet`.

**Lösung:**
```typescript
useNativeDriver: Platform.OS !== 'web'
// Ausnahme: bei shadowOpacity oder Farb-Properties immer false:
useNativeDriver: false
```

---

## 8. `shadow*`-Props auf Web erzeugen Warnungen

**Problem:** React Native Web kennt `shadowColor`, `shadowOffset` usw. nicht – stattdessen `boxShadow`. Direkte `shadow*`-Props auf Web erzeugen Console-Warnings und haben keinen Effekt.

**Aufgetreten bei:** `presetBtnSaveMode`-Style in `App.tsx`.

**Lösung:**
```typescript
...Platform.select({
  native: { shadowColor: '#e8aa14', shadowOpacity: 0.9, shadowRadius: 8, elevation: 6 },
  web: { boxShadow: '0 0 8px 3px #e8aa14' },
})
```

---

## 9. `gap` in `flexWrap`-Containern auf Android ignoriert

**Problem:** `gap` (CSS-Style) wird in React Native auf Android in `flexWrap: 'wrap'`-Containern nicht korrekt berücksichtigt – die Abstände zwischen den Elementen fehlen oder sind falsch.

**Aufgetreten bei:** Preset-Canvas (`presetGrid`) in `App.tsx`.

**Lösung:** `gap` entfernen, stattdessen `margin` auf die Kinder-Views setzen und die Breite der Kinder auf einen Festwert setzen (z.B. `width: '23%'`).

---

## 10. `PanResponder` in `useMemo` – Stale Closures

**Problem:** `PanResponder`-Instanzen die in `useMemo([], [])` erzeugt werden, schließen über den initialen State hinaus. State-Werte aus dem Zeitpunkt der Erzeugung werden eingefroren → veraltete Werte beim Drag-Ende.

**Aufgetreten bei:** `dragResponders` in `App.tsx`.

**Lösung:** State-abhängige Logik in einen `Ref` auslagern der bei jedem Render aktualisiert wird:
```typescript
const applyDragToolRef = useRef<(tool: string, trackId: 1|2, path: number[]) => void>(() => {});
// In der Render-Funktion (kein useEffect nötig):
applyDragToolRef.current = (tool, trackId, path) => { /* aktueller State */ };
// Im PanResponder (useMemo):
onPanResponderRelease: () => { applyDragToolRef.current(tool, trackId, path); }
```
