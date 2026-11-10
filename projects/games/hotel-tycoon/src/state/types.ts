// Serializable game state. Everything the player can lose lives here, and only here.
// Bump SAVE_VERSION and add a migration in core/migrations.ts whenever this changes shape.

export const SAVE_VERSION = 1;

export type Speed = 0 | 1 | 2 | 4;
export type Side = 'n' | 's' | 'e' | 'w';
export type Facing = 's' | 'e' | 'n' | 'w';

/** A rectangular piece of ground covered by a building. Floors stack vertically. */
export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  floors: number;
  facade: number;
}

/** A room / space inside a building on a given floor (grid aligned, metres). */
export interface Area {
  id: string;
  type: string;
  buildingId: string;
  floor: number;
  x: number;
  y: number;
  w: number;
  d: number;
  level: number;
  label?: string;
  /** Openings in this area's border. x/y is the cell inside this area next to the opening. */
  doors: Door[];
  /** Area this one sits inside (e.g. bathroom inside a guest room). */
  parentId?: string;
}

export interface Door {
  x: number;
  y: number;
  side: Side;
  width?: number;
  kind?: 'door' | 'arch' | 'entrance';
}

export interface Furniture {
  id: string;
  type: string;
  areaId: string;
  x: number;
  y: number;
  facing: Facing;
  variant?: number;
}

/** Ground surfaces and decor outside buildings. */
export interface Surface {
  id: string;
  kind: 'path' | 'drive' | 'sand' | 'water' | 'flowerbed' | 'lawn' | 'plaza';
  x: number;
  y: number;
  w: number;
  d: number;
}

export interface Decor {
  id: string;
  type: string;
  x: number;
  y: number;
  variant?: number;
}

export interface Layout {
  lot: { w: number; d: number };
  buildings: Building[];
  areas: Area[];
  furniture: Furniture[];
  surfaces: Surface[];
  decor: Decor[];
}

export type RoomStatus = 'vacant' | 'occupied' | 'dirty' | 'maintenance';

export interface RoomState {
  status: RoomStatus;
  /** Custom nightly price; undefined = type default. */
  price?: number;
}

export interface GameState {
  version: number;
  meta: {
    id: string;
    hotelName: string;
    createdAt: number;
    savedAt: number;
    playSeconds: number;
  };
  clock: { day: number; minute: number; speed: Speed };
  finance: { money: number };
  rating: { stars: number; score: number };
  layout: Layout;
  rooms: Record<string, RoomState>;
  /** Nightly price per guest-room type. */
  pricing: Record<string, number>;
  unlocks: string[];
  settings: { view: 'interior' | 'exterior'; viewFloor: number };
  /** Monotonic id counter used by the build system. */
  nextId: number;
}
