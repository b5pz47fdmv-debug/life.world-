/** Footprint on the ground plane (metres). */
export interface Footprint { x0: number; y0: number; x1: number; y1: number }

const EPS = 1e-3;

/** True if `a` must be drawn before (behind) `b`. Standard isometric box rule. */
export function isBehind(a: Footprint, b: Footprint): boolean {
  if (a.x1 <= b.x0 + EPS) return true;
  if (b.x1 <= a.x0 + EPS) return false;
  if (a.y1 <= b.y0 + EPS) return true;
  if (b.y1 <= a.y0 + EPS) return false;
  // Overlapping footprints: fall back to centre depth.
  return a.x0 + a.x1 + a.y0 + a.y1 < b.x0 + b.x1 + b.y0 + b.y1;
}

export interface SortItem { fp: Footprint; screen?: { minX: number; minY: number; maxX: number; maxY: number } }

function screensOverlap(a: SortItem, b: SortItem): boolean {
  if (!a.screen || !b.screen) return true;
  return a.screen.minX < b.screen.maxX && b.screen.minX < a.screen.maxX && a.screen.minY < b.screen.maxY && b.screen.minY < a.screen.maxY;
}

/**
 * Topological painter's sort. Only pairs whose screen boxes overlap get an ordering
 * constraint, which keeps the graph sparse and avoids spurious cycles.
 * Returns item indices in draw order (back to front).
 */
export function isoSort(items: SortItem[]): number[] {
  const n = items.length;
  const before: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (!screensOverlap(items[i], items[j])) continue;
      if (isBehind(items[i].fp, items[j].fp)) before[j].push(i);
      else before[i].push(j);
    }
  const state = new Uint8Array(n); // 0 new, 1 visiting, 2 done
  const out: number[] = [];
  // Seed DFS in centre-depth order so ties look natural.
  const seed = [...Array(n).keys()].sort((a, b) => depthOf(items[a].fp) - depthOf(items[b].fp));
  const visit = (i: number) => {
    if (state[i] === 2) return;
    if (state[i] === 1) return; // cycle: ignore edge
    state[i] = 1;
    for (const k of before[i]) visit(k);
    state[i] = 2;
    out.push(i);
  };
  for (const i of seed) visit(i);
  return out;
}

function depthOf(f: Footprint): number {
  return f.x0 + f.x1 + f.y0 + f.y1;
}
