// Pure layout logic: placement validation, expansion operations and wall derivation.
// No rendering, no DOM – fully unit tested. The build mode (phase 5) is a UI on top of this.
import { AREA_TYPES } from '../../data/catalog';
import type { Area, Building, Door, Furniture, Layout, Side } from '../../state/types';

export interface Rect { x: number; y: number; w: number; d: number }

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.d <= outer.y + outer.d;
}

export function areaSize(a: Area): number {
  return a.w * a.d;
}

/** Net floor area: area minus nested child areas (e.g. bathroom counted separately). */
export function netAreaSize(layout: Layout, a: Area): number {
  const kids = layout.areas.filter((c) => c.parentId === a.id);
  return areaSize(a) - kids.reduce((s, c) => s + areaSize(c), 0);
}

export type PlacementError =
  | 'unknown-type'
  | 'no-building'
  | 'bad-floor'
  | 'outside-building'
  | 'too-small'
  | 'overlap'
  | 'bad-parent';

/** Checks whether an area can be placed. Returns null when valid. */
export function validateArea(layout: Layout, area: Omit<Area, 'id' | 'doors'> & { id?: string }): PlacementError | null {
  const def = AREA_TYPES[area.type];
  if (!def) return 'unknown-type';
  const b = layout.buildings.find((x) => x.id === area.buildingId);
  if (!b) return 'no-building';
  if (area.floor < 0 || area.floor >= b.floors) return 'bad-floor';
  if (!rectContains(b, area)) return 'outside-building';
  if (area.w < def.minSize[0] || area.d < def.minSize[1]) {
    // Allow rotated minimum size.
    if (area.w < def.minSize[1] || area.d < def.minSize[0]) return 'too-small';
  }
  if (area.parentId) {
    const parent = layout.areas.find((p) => p.id === area.parentId);
    if (!parent || parent.floor !== area.floor || !rectContains(parent, area)) return 'bad-parent';
  }
  for (const o of layout.areas) {
    if (o.id === area.id || o.buildingId !== area.buildingId || o.floor !== area.floor) continue;
    if (!rectsOverlap(o, area)) continue;
    // Nesting is allowed only between a parent and its direct child.
    if (area.parentId === o.id || o.parentId === area.id) continue;
    return 'overlap';
  }
  return null;
}

/** Validates a whole layout. Returns a list of human-readable problems (empty = valid). */
export function validateLayout(layout: Layout): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const a of layout.areas) {
    if (ids.has(a.id)) problems.push(`duplicate id ${a.id}`);
    ids.add(a.id);
    const err = validateArea(layout, a);
    if (err) problems.push(`${a.id}: ${err}`);
  }
  for (const f of layout.furniture) {
    if (!layout.areas.some((a) => a.id === f.areaId)) problems.push(`furniture ${f.id}: missing area`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Cell map & walls
// ---------------------------------------------------------------------------

export interface CellMap {
  building: Building;
  floor: number;
  /** Area id per cell (most specific / nested area wins), or null. Index: (y-b.y)*b.w+(x-b.x) */
  cells: (string | null)[];
  get(x: number, y: number): string | null;
}

export function buildCellMap(layout: Layout, buildingId: string, floor: number): CellMap {
  const b = layout.buildings.find((x) => x.id === buildingId);
  if (!b) throw new Error(`no building ${buildingId}`);
  const cells: (string | null)[] = new Array(b.w * b.d).fill(null);
  // Parents first, children after (children overwrite parents).
  const areas = layout.areas
    .filter((a) => a.buildingId === buildingId && a.floor === floor)
    .sort((a, c) => (a.parentId ? 1 : 0) - (c.parentId ? 1 : 0));
  for (const a of areas) {
    for (let y = a.y; y < a.y + a.d; y++)
      for (let x = a.x; x < a.x + a.w; x++) cells[(y - b.y) * b.w + (x - b.x)] = a.id;
  }
  return {
    building: b,
    floor,
    cells,
    get(x, y) {
      if (x < b.x || y < b.y || x >= b.x + b.w || y >= b.y + b.d) return null;
      return cells[(y - b.y) * b.w + (x - b.x)];
    },
  };
}

export type WallKind = 'back' | 'front' | 'interior';
export type OpeningKind = Door['kind'];

/**
 * A 1 m wall segment.
 * axis 'x': runs from (x,y) to (x+1,y) – separates cell (x,y-1) [minus side] and (x,y) [plus side].
 * axis 'y': runs from (x,y) to (x,y+1) – separates cell (x-1,y) [minus side] and (x,y) [plus side].
 */
export interface WallSegment {
  x: number;
  y: number;
  axis: 'x' | 'y';
  kind: WallKind;
  minus: string | null;
  plus: string | null;
  opening: OpeningKind | null;
}

function doorCells(d: Door): { x: number; y: number }[] {
  const w = d.width ?? 1;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < w; i++) {
    if (d.side === 'n' || d.side === 's') out.push({ x: d.x + i, y: d.y });
    else out.push({ x: d.x, y: d.y + i });
  }
  return out;
}

/** Key of the wall segment on a given side of a cell. */
function edgeKey(x: number, y: number, side: Side): string {
  switch (side) {
    case 'n': return `x:${x}:${y}`;
    case 's': return `x:${x}:${y + 1}`;
    case 'w': return `y:${x}:${y}`;
    case 'e': return `y:${x + 1}:${y}`;
  }
}

export function computeWalls(layout: Layout, buildingId: string, floor: number): WallSegment[] {
  const map = buildCellMap(layout, buildingId, floor);
  const b = map.building;
  const openings = new Map<string, OpeningKind>();
  for (const a of layout.areas) {
    if (a.buildingId !== buildingId || a.floor !== floor) continue;
    for (const d of a.doors) for (const c of doorCells(d)) openings.set(edgeKey(c.x, c.y, d.side), d.kind ?? 'door');
  }
  const segs: WallSegment[] = [];
  const push = (x: number, y: number, axis: 'x' | 'y', minus: string | null, plus: string | null) => {
    if (minus === plus) return;
    let kind: WallKind = 'interior';
    if (minus === null) kind = 'back';
    else if (plus === null) kind = 'front';
    segs.push({ x, y, axis, kind, minus, plus, opening: openings.get(`${axis}:${x}:${y}`) ?? null });
  };
  for (let y = b.y; y <= b.y + b.d; y++)
    for (let x = b.x; x < b.x + b.w; x++) push(x, y, 'x', map.get(x, y - 1), map.get(x, y));
  for (let x = b.x; x <= b.x + b.w; x++)
    for (let y = b.y; y < b.y + b.d; y++) push(x, y, 'y', map.get(x - 1, y), map.get(x, y));
  return segs;
}

// ---------------------------------------------------------------------------
// Expansion operations (used by the initial hotel & the phase 5 build mode)
// ---------------------------------------------------------------------------

export interface IdSource { nextId: number }

export function newId(src: IdSource, prefix: string): string {
  return `${prefix}${src.nextId++}`;
}

export function addFloor(layout: Layout, buildingId: string): number {
  const b = layout.buildings.find((x) => x.id === buildingId);
  if (!b) throw new Error('no building');
  b.floors += 1;
  return b.floors - 1;
}

export function addArea(layout: Layout, ids: IdSource, area: Omit<Area, 'id'>): Area {
  const err = validateArea(layout, area);
  if (err) throw new Error(`cannot place ${area.type}: ${err}`);
  const full: Area = { ...area, id: newId(ids, 'a') };
  layout.areas.push(full);
  return full;
}

export function addFurniture(layout: Layout, ids: IdSource, f: Omit<Furniture, 'id'>): Furniture {
  const full: Furniture = { ...f, id: newId(ids, 'f') };
  layout.furniture.push(full);
  return full;
}

/**
 * Creates a fully furnished guest room (room + en-suite bathroom + furniture).
 * The door is on the south side (+y), opening to a corridor.
 */
export function addGuestRoom(
  layout: Layout,
  ids: IdSource,
  opts: { buildingId: string; floor: number; x: number; y: number; type?: string; label?: string },
): Area {
  const type = opts.type ?? 'room_standard';
  const def = AREA_TYPES[type];
  const [w, d] = def.minSize;
  const { x, y } = opts;
  const room = addArea(layout, ids, {
    type, buildingId: opts.buildingId, floor: opts.floor, x, y, w, d, level: 1, label: opts.label,
    doors: [{ x: x + 1, y: y + d - 1, side: 's', kind: 'door' }],
  });
  const bath = addArea(layout, ids, {
    type: 'bathroom', buildingId: opts.buildingId, floor: opts.floor, x: x + w - 2, y: y + d - 2, w: 2, d: 2, level: 1,
    parentId: room.id, doors: [{ x: x + w - 2, y: y + d - 1, side: 'w', kind: 'door' }],
  });
  const F = (type: string, fx: number, fy: number, facing: Furniture['facing'], areaId = room.id, variant?: number) =>
    addFurniture(layout, ids, { type, areaId, x: x + fx, y: y + fy, facing, variant });
  // Tall pieces stand against the back (north / west) walls so the cutaway walls never hide them.
  F('rug', 0.75, 1.6, 's');
  F('bed_king', 1.05, 0.12, 's');
  F('nightstand', 0.45, 0.16, 's');
  F('nightstand', 3.05, 0.16, 's');
  F('desk', 0.06, 2.05, 'e');
  F('wardrobe', 0.06, 3.8, 'e');
  F('armchair', 2.55, 2.3, 'w');
  F('floor_lamp', 3.45, 2.05, 's');
  F('plant_small', 3.56, 0.3, 's');
  F('vanity', w - 1.94, d - 1.93, 's', bath.id);
  F('shower', w - 0.95, d - 1.93, 's', bath.id);
  F('toilet', w - 0.62, d - 0.78, 'w', bath.id);
  return room;
}

export function guestRooms(layout: Layout): Area[] {
  return layout.areas.filter((a) => AREA_TYPES[a.type]?.category === 'guestRoom');
}
