/**
 * Rekursives Datenmodell für den Step-Sequencer.
 * Tiefenlimit: 3 Ebenen (4tel → 8tel → 16tel → max).
 */

export interface StepNode {
  id: string;                  // eindeutig für React-Keys
  active: boolean;             // spielt? (nur Blätter relevant)
  subdivision: 2 | 3 | null;   // null = Blatt; 2 = binär (÷2); 3 = Triole (÷3)
  children: StepNode[];        // leer wenn Blatt
}

export interface TrackStepPattern {
  nodes: StepNode[];           // Länge = beatsA bzw. beatsB
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

let _idCounter = 0;
function newId(): string {
  return `sn_${++_idCounter}`;
}

/** Erstellt ein Pattern mit `beats` aktiven Blatt-Knoten (keine Unterteilung). */
export function makeDefaultPattern(beats: number): TrackStepPattern {
  const nodes: StepNode[] = Array.from({ length: beats }, () => ({
    id: newId(),
    active: true,
    subdivision: null,
    children: [],
  }));
  return { nodes };
}

/**
 * Flacht einen einzelnen Knoten zu einer Liste von Offsets (0–1)
 * innerhalb des ihm zugewiesenen Zeitfensters auf.
 */
function flattenNode(
  node: StepNode,
  startFrac: number,
  durationFrac: number,
  out: number[],
): void {
  if (node.subdivision === null || node.children.length === 0) {
    // Blatt
    if (node.active) {
      out.push(startFrac);
    }
  } else {
    const subDur = durationFrac / node.subdivision;
    for (let i = 0; i < node.children.length; i++) {
      flattenNode(node.children[i], startFrac + i * subDur, subDur, out);
    }
  }
}

/**
 * Wandelt ein TrackStepPattern in ein events-Array für den AudioEngine um.
 * Rückgabe: `events[beatIndex]` = Array von Offsets (0–1) innerhalb dieses Beats.
 * Muster: [[0], [0, 0.5], [0, 0.333, 0.667]] etc.
 */
export function flattenPattern(pattern: TrackStepPattern): number[][] {
  return pattern.nodes.map((node) => {
    const offsets: number[] = [];
    flattenNode(node, 0, 1, offsets);
    return offsets;
  });
}

/**
 * Wendet eine Mutation auf einen Knoten-Pfad an (immutable update).
 * `path` = Array von Indizes vom Root-Node bis zum Ziel-Kind.
 * Gibt das neue `nodes`-Array zurück.
 */
export function updateNode(
  nodes: StepNode[],
  path: number[],
  updater: (node: StepNode) => StepNode,
): StepNode[] {
  if (path.length === 0) return nodes;
  const [head, ...rest] = path;
  return nodes.map((n, i) => {
    if (i !== head) return n;
    if (rest.length === 0) return updater(n);
    return { ...n, children: updateNode(n.children, rest, updater) };
  });
}

/**
 * Erstellt Kind-Knoten für eine Unterteilung (binär oder Triole).
 * Aktive Blätter werden in subdivision-Kinder aufgeteilt.
 */
export function subdivideNode(node: StepNode, sub: 2 | 3): StepNode {
  const children: StepNode[] = Array.from({ length: sub }, () => ({
    id: newId(),
    active: true,
    subdivision: null,
    children: [],
  }));
  return { ...node, subdivision: sub, children };
}

/**
 * Hebt die Unterteilung eines Knotens auf (zurück zum Blatt).
 * Der Knoten wird aktiv, wenn mindestens ein Kind aktiv war.
 */
export function collapseNode(node: StepNode): StepNode {
  const anyActive = node.children.some((c) => c.active);
  return { id: node.id, active: anyActive, subdivision: null, children: [] };
}
