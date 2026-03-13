import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import type { TrackStepPattern, StepNode } from '../types/stepPattern';
import { updateNode, subdivideNode, collapseNode } from '../types/stepPattern';

const ACCENT_A = '#ff6b35';
const ACCENT_B = '#e8aa14';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface StepViewProps {
  patternA: TrackStepPattern;
  patternB: TrackStepPattern;
  onPatternA: (p: TrackStepPattern) => void;
  onPatternB: (p: TrackStepPattern) => void;
  /** -1 when not playing */
  activeBeatA: number;
  activeBeatB: number;
  isPlaying: boolean;
  beatsA: number;
  beatsB: number;
  onReset: () => void;
}

// ─── Handle (exposed via ref) ─────────────────────────────────────────────────

export interface StepViewHandle {
  /** Returns { trackId, path } for screen coords (x, y), or null if no hit. */
  hitTest(x: number, y: number): { trackId: 1 | 2; path: number[] } | null;
}

// ─── Subdivision Picker Modal ─────────────────────────────────────────────────

interface SubdivPickerProps {
  depth: number;
  onChoose: (sub: 2 | 3) => void;
  onCollapse?: () => void;
  onClose: () => void;
}

function SubdivPicker({ depth, onChoose, onCollapse, onClose }: SubdivPickerProps) {
  const canSubdivide = depth < 3;
  return (
    <Modal transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.pickerBox}>
          {canSubdivide && (
            <>
              <Text style={styles.pickerTitle}>Unterteilen</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => onChoose(2)}>
                  <Text style={styles.pickerBtnTxt}>÷ 2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => onChoose(3)}>
                  <Text style={styles.pickerBtnTxt}>÷ 3</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {onCollapse && (
            <TouchableOpacity
              style={[styles.pickerBtn, styles.pickerBtnCollapse]}
              onPress={onCollapse}
            >
              <Text style={styles.pickerBtnCollapseTxt}>↩ Aufheben</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.pickerCancel} onPress={onClose}>
            <Text style={styles.pickerCancelTxt}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Recursive Node Cell ──────────────────────────────────────────────────────

interface NodeCellProps {
  node: StepNode;
  /** Full path from root array to this node, incl. beat index as first element. */
  fullPath: number[];
  depth: number;
  trackColor: string;
  isDesign: boolean;
  onToggle: (path: number[]) => void;
  /** depth is forwarded so the handler can decide: subdivide vs collapse-parent. */
  onLongAction: (path: number[], depth: number) => void;
  /** Called by leaf nodes to register their screen position for drag hit-testing. */
  onLeafMount: (path: number[], view: any) => void;
}

const NodeCell = memo(function NodeCell({
  node,
  fullPath,
  depth,
  trackColor,
  isDesign,
  onToggle,
  onLongAction,
  onLeafMount,
}: NodeCellProps) {
  // useRef muss vor dem early-return stehen (Hook-Regel)
  const nodeRef = useRef<any>(null);

  if (node.subdivision !== null) {
    // Subdivided – render children as a horizontal flex row.
    // A thin colored top-border visually groups the sub-cells.
    return (
      <View
        style={[
          styles.subdivContainer,
          { borderTopColor: trackColor + '99', borderTopWidth: 2 },
        ]}
      >
        {node.children.map((child, i) => (
          <NodeCell
            key={child.id}
            node={child}
            fullPath={[...fullPath, i]}
            depth={depth + 1}
            trackColor={trackColor}
            isDesign={isDesign}
            onToggle={onToggle}
            onLongAction={onLongAction}
            onLeafMount={onLeafMount}
          />
        ))}
      </View>
    );
  }

  // Leaf – tap to toggle, long-press for subdivision or parent-collapse.
  const margin = depth === 0 ? 3 : depth === 1 ? 2 : 1;
  const radius = depth === 0 ? 8 : depth === 1 ? 5 : 3;

  return (
    <TouchableOpacity
      ref={nodeRef}
      onLayout={() => {
        // onLayout féuert nach dem echten Layout – measureInWindow liefert korrekte Werte
        if (nodeRef.current) onLeafMount(fullPath, nodeRef.current);
      }}
      style={[
        styles.leafCell,
        {
          margin,
          borderRadius: radius,
          backgroundColor: node.active ? trackColor + 'cc' : '#2a2a2e',
          borderColor: trackColor + '55',
        },
      ]}
      onPress={() => onToggle(fullPath)}
      onLongPress={() => onLongAction(fullPath, depth)}
      delayLongPress={450}
      activeOpacity={0.6}
      {...(Platform.OS === 'web' ? { onContextMenu: (e: any) => e.preventDefault() } : {})}
    />
  );
});

type LayoutRect = { x: number; y: number; w: number; h: number };
type LeafEntry = { path: number[]; rect: LayoutRect };

// ─── Main Component ───────────────────────────────────────────────────────────

export const StepView = forwardRef<StepViewHandle, StepViewProps>(function StepView({
  patternA,
  patternB,
  onPatternA,
  onPatternB,
  activeBeatA,
  activeBeatB,
  isPlaying,
  beatsA,
  beatsB,
  onReset,
}: StepViewProps, ref) {
  const [picker, setPicker] = useState<{ path: number[]; trackId: 1 | 2; depth: number } | null>(null);

  // ── Beat cell refs + layout cache (for drag-and-drop hit testing) ────────
  const beatRefsA = useRef<Array<any>>([]);
  const beatRefsB = useRef<Array<any>>([]);
  const layoutCacheA = useRef<LeafEntry[]>([]);
  const layoutCacheB = useRef<LeafEntry[]>([]);

  // Clear leaf caches when beat counts change (stale entries would mis-hit)
  useEffect(() => { layoutCacheA.current = []; beatRefsA.current = []; }, [beatsA]);
  useEffect(() => { layoutCacheB.current = []; beatRefsB.current = []; }, [beatsB]);

  const registerLeafA = useCallback((path: number[], view: any) => {
    view?.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (w === 0 && h === 0) return; // Layout noch nicht bereit
      const key = path.join(',');
      // Alten Eintrag für denselben Pfad + stale Parent-Einträge (Präfix) entfernen
      layoutCacheA.current = layoutCacheA.current.filter(e => {
        const eKey = e.path.join(',');
        if (eKey === key) return false;
        if (e.path.length < path.length && key.startsWith(eKey + ',')) return false;
        return true;
      });
      layoutCacheA.current.push({ path, rect: { x, y, w, h } });
    });
  }, []);

  const registerLeafB = useCallback((path: number[], view: any) => {
    view?.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (w === 0 && h === 0) return;
      const key = path.join(',');
      layoutCacheB.current = layoutCacheB.current.filter(e => {
        const eKey = e.path.join(',');
        if (eKey === key) return false;
        if (e.path.length < path.length && key.startsWith(eKey + ',')) return false;
        return true;
      });
      layoutCacheB.current.push({ path, rect: { x, y, w, h } });
    });
  }, []);

  useImperativeHandle(ref, () => ({
    hitTest(x: number, y: number) {
      for (const e of layoutCacheA.current) {
        const r = e.rect;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
          return { trackId: 1 as const, path: e.path };
      }
      for (const e of layoutCacheB.current) {
        const r = e.rect;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
          return { trackId: 2 as const, path: e.path };
      }
      return null;
    },
  }), []);

  // ── Flash animation maps (stable ref objects) ────────────────────────────
  const flashA = useRef<{ [k: number]: Animated.Value }>({});
  const flashB = useRef<{ [k: number]: Animated.Value }>({});

  // Lazily create Animated.Values for all current beat indices.
  for (let i = 0; i < beatsA; i++) {
    if (!flashA.current[i]) flashA.current[i] = new Animated.Value(0);
  }
  for (let i = 0; i < beatsB; i++) {
    if (!flashB.current[i]) flashB.current[i] = new Animated.Value(0);
  }

  // ── Flash on beat fire ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeBeatA < 0) return;
    const anim = flashA.current[activeBeatA % beatsA];
    if (!anim) return;
    anim.setValue(0.45);
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [activeBeatA, beatsA]);

  useEffect(() => {
    if (activeBeatB < 0) return;
    const anim = flashB.current[activeBeatB % beatsB];
    if (!anim) return;
    anim.setValue(0.45);
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [activeBeatB, beatsB]);

  // ── Pattern mutation callbacks ───────────────────────────────────────────

  const toggleA = useCallback(
    (path: number[]) =>
      onPatternA({ nodes: updateNode(patternA.nodes, path, n => ({ ...n, active: !n.active })) }),
    [patternA, onPatternA],
  );

  const toggleB = useCallback(
    (path: number[]) =>
      onPatternB({ nodes: updateNode(patternB.nodes, path, n => ({ ...n, active: !n.active })) }),
    [patternB, onPatternB],
  );

  const longA = useCallback(
    (path: number[], depth: number) => setPicker({ path, trackId: 1, depth }),
    [],
  );

  const longB = useCallback(
    (path: number[], depth: number) => setPicker({ path, trackId: 2, depth }),
    [],
  );

  const handleSubdivChoose = useCallback(
    (sub: 2 | 3) => {
      if (!picker) return;
      const { path, trackId } = picker;
      if (trackId === 1) {
        onPatternA({ nodes: updateNode(patternA.nodes, path, n => subdivideNode(n, sub)) });
      } else {
        onPatternB({ nodes: updateNode(patternB.nodes, path, n => subdivideNode(n, sub)) });
      }
      setPicker(null);
    },
    [picker, patternA, patternB, onPatternA, onPatternB],
  );

  const handleSubdivCollapse = useCallback(() => {
    if (!picker) return;
    const { path, trackId } = picker;
    const parentPath = path.slice(0, -1);
    if (trackId === 1) {
      onPatternA({ nodes: updateNode(patternA.nodes, parentPath, collapseNode) });
    } else {
      onPatternB({ nodes: updateNode(patternB.nodes, parentPath, collapseNode) });
    }
    setPicker(null);
  }, [picker, patternA, patternB, onPatternA, onPatternB]);

  // ── Track row renderer ────────────────────────────────────────────────────

  const renderTrack = (
    label: string,
    color: string,
    pattern: TrackStepPattern,
    flashMap: { [k: number]: Animated.Value },
    onTog: (p: number[]) => void,
    onLng: (p: number[], d: number) => void,
    cellRefs: React.MutableRefObject<any[]>,
    layoutCache: React.MutableRefObject<LeafEntry[]>,
    registerLeaf: (path: number[], view: any) => void,
  ) => (
    <View style={styles.trackRowOuter}>
      <View style={[styles.beatsRow]}>
        {pattern.nodes.map((node, beatIdx) => (
          <View
            key={node.id}
            style={styles.beatCell}
            ref={(el: any) => { cellRefs.current[beatIdx] = el; }}
          >
            {/* Flash overlay – on top of content, blocks no touches */}
            <Animated.View
              style={[
                styles.flashOverlay,
                { backgroundColor: color, opacity: flashMap[beatIdx] ?? 0 },
              ]}
              pointerEvents="none"
            />
            <NodeCell
              node={node}
              fullPath={[beatIdx]}
              depth={0}
              trackColor={color}
              isDesign={true}
              onToggle={onTog}
              onLongAction={onLng}
              onLeafMount={registerLeaf}
            />
          </View>
        ))}
      </View>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Reset button */}
      <View style={styles.modeBar}>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetBtnTxt}>↺ Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Track rows */}
      <View style={styles.tracksContainer}>
        {renderTrack('A', ACCENT_A, patternA, flashA.current, toggleA, longA, beatRefsA, layoutCacheA, registerLeafA)}
        {renderTrack('B', ACCENT_B, patternB, flashB.current, toggleB, longB, beatRefsB, layoutCacheB, registerLeafB)}
      </View>

      {/* Subdivision picker */}
      {picker && (
        <SubdivPicker
          depth={picker.depth}
          onChoose={handleSubdivChoose}
          onCollapse={picker.depth > 0 ? handleSubdivCollapse : undefined}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Mode toggle bar
  modeBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 10,
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#222',
  },
  resetBtnTxt: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },

  // Track rows
  tracksContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  trackRowOuter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    maxHeight: 200,
  },
  trackLabel: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginRight: 8,
  },
  trackLabelTxt: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  beatsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  beatCell: {
    flex: 1,
    overflow: 'hidden',
  },
  flashOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    zIndex: 5,
  },
  rowSpacer: {
    height: 0,
  },

  // Node cells
  subdivContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leafCell: {
    flex: 1,
    borderWidth: 1.5,
  },

  // Subdivision picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: '#2a2a2e',
    borderRadius: 14,
    padding: 22,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#444',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 14,
  },
  pickerBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#3a3a3e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  pickerBtnTxt: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickerCancel: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  pickerCancelTxt: {
    color: '#777',
    fontSize: 13,
  },
  pickerBtnCollapse: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#3a2a2a',
    borderColor: '#7a4040',
  },
  pickerBtnCollapseTxt: {
    color: '#e08080',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
