import { AREA_TYPES, GAME_BALANCE } from './catalog';
import { addArea, addFurniture, addGuestRoom } from '../sim/hotel/layout';
import { SAVE_VERSION, type Decor, type GameState, type Layout, type Surface } from '../state/types';

/** Builds the starting resort: a boutique beach hotel with a grand lobby and 4 rooms. */
export function createInitialState(now = Date.now()): GameState {
  const layout: Layout = {
    lot: { w: 40, d: 40 },
    buildings: [{ id: 'b1', name: 'הבניין הראשי', x: 12, y: 8, w: 16, d: 14, floors: 1, facade: 0xf2e8d5 }],
    areas: [],
    furniture: [],
    surfaces: [],
    decor: [],
  };
  const ids = { nextId: 1 };

  // Guest rooms along the back of the building.
  const roomNames = ['101', '102', '103', '104'];
  roomNames.forEach((label, i) => addGuestRoom(layout, ids, { buildingId: 'b1', floor: 0, x: 12 + i * 4, y: 8, label }));

  // Corridor connecting rooms to the lobby through a wide arch.
  const corridor = addArea(layout, ids, {
    type: 'corridor', buildingId: 'b1', floor: 0, x: 12, y: 13, w: 16, d: 2, level: 1,
    doors: [{ x: 18, y: 14, side: 's', width: 4, kind: 'arch' }],
  });
  // Grand lobby with the main entrance on the front facade.
  const lobby = addArea(layout, ids, {
    type: 'lobby', buildingId: 'b1', floor: 0, x: 12, y: 15, w: 16, d: 7, level: 1,
    doors: [{ x: 18, y: 21, side: 's', width: 4, kind: 'entrance' }],
  });

  const L = (type: string, x: number, y: number, facing: 's' | 'e' | 'n' | 'w' = 's', variant?: number) =>
    addFurniture(layout, ids, { type, areaId: lobby.id, x, y, facing, variant });
  L('rug_grand', 21.2, 16.4, 's');
  L('rug_runner', 18.3, 17.0, 's');
  L('feature_wall', 12.02, 15.7, 'e');
  L('reception_desk', 13.5, 16.2, 'e');
  L('bell', 13.85, 17.9, 'e');
  L('sofa', 22.7, 16.65, 's');
  L('sofa', 22.7, 19.55, 'n');
  L('armchair', 21.4, 17.85, 'e');
  L('armchair', 25.75, 17.85, 'w');
  L('coffee_table', 23.0, 18.0, 's');
  L('flower_table', 19.25, 17.95, 's');
  L('column', 17.1, 20.75, 's');
  L('column', 22.4, 20.75, 's');
  L('column', 17.1, 15.35, 's');
  L('column', 22.4, 15.35, 's');
  L('plant_large', 12.25, 20.9, 's');
  L('plant_large', 27.05, 15.25, 's');
  L('plant_large', 27.05, 20.9, 's');
  L('luggage_cart', 15.2, 20.2, 's');
  L('bench', 25.4, 21.25, 's');

  const C = (type: string, x: number, y: number, facing: 's' | 'e' | 'n' | 'w' = 's') =>
    addFurniture(layout, ids, { type, areaId: corridor.id, x, y, facing });
  C('plant_large', 12.2, 13.15);
  C('console', 26.4, 13.15, 's');
  C('plant_small', 27.3, 13.2);

  // --- Grounds -------------------------------------------------------------
  let sid = 0;
  const S = (kind: Surface['kind'], x: number, y: number, w: number, d: number) =>
    layout.surfaces.push({ id: `s${++sid}`, kind, x, y, w, d });
  S('sand', 0, 33, 40, 4);
  S('water', 0, 37, 40, 3);
  S('plaza', 14, 22, 12, 5);
  S('drive', 0, 27, 40, 3);
  S('path', 19, 30, 2, 3);
  S('path', 9, 9, 3, 2);
  S('path', 8, 9, 1, 18);
  S('path', 28, 15, 4, 2);
  S('path', 32, 15, 2, 12);
  S('flowerbed', 12, 22, 2, 1);
  S('flowerbed', 26, 22, 2, 1);
  S('flowerbed', 12, 6, 16, 1);
  S('flowerbed', 10, 8, 1, 14);

  let did = 0;
  const D = (type: string, x: number, y: number, variant?: number) => layout.decor.push({ id: `d${++did}`, type, x, y, variant } as Decor);
  D('fountain', 20, 24.6);
  D('hotel_sign', 15.0, 26.4);
  for (const x of [2, 6, 10, 30, 34, 38]) { D('palm', x, 26.3, x % 3); D('palm', x, 31.3, (x + 1) % 3); }
  D('palm', 14.3, 23.0, 1); D('palm', 25.7, 23.0, 2);
  D('palm', 4, 34.2, 0); D('palm', 36.5, 34.0, 1); D('palm', 16, 34.6, 2);
  for (const x of [6.5, 9.5, 12.5, 26.5, 29.5, 32.5]) { D('umbrella', x, 34.6, Math.round(x) % 3); D('lounger', x - 0.7, 35.1); D('lounger', x + 0.4, 35.1); }
  for (const x of [17.6, 22.4]) D('lamp', x, 30.6);
  for (const x of [5, 15, 25, 35]) D('lamp', x, 26.6);
  for (let y = 11; y <= 25; y += 4) D('lamp', 7.6, y);
  D('bench', 16.4, 25.2); D('bench', 23.0, 25.2);
  D('car', 24.0, 27.6, 0); D('car', 31.5, 28.3, 1); D('car', 6.0, 27.6, 2);
  for (const x of [13, 16, 19, 22, 25]) D('tree', x + 0.5, 4.5, x % 2);
  for (const x of [3, 5]) for (const y of [5, 12, 19]) D('tree', x, y, (x + y) % 2);
  for (let y = 9; y < 22; y += 2) D('bush', 10.5, y + 0.5, y % 3);
  for (let x = 12.5; x < 28; x += 2) D('bush', x, 6.5, x % 3);
  for (const [x, y] of [[29.5, 9], [31, 11.5], [35, 9.5], [37.5, 13], [36, 19], [30, 21], [38, 23]]) D('tree', x, y, (x + y) % 2);
  D('flag', 11.2, 24.0, 0); D('flag', 11.2, 25.8, 1);

  const pricing: Record<string, number> = {};
  for (const def of Object.values(AREA_TYPES)) if (def.room) pricing[def.id] = def.room.basePrice;

  const rooms: GameState['rooms'] = {};
  for (const a of layout.areas) if (AREA_TYPES[a.type].category === 'guestRoom') rooms[a.id] = { status: 'vacant' };

  return {
    version: SAVE_VERSION,
    meta: { id: `h${now.toString(36)}`, hotelName: 'אחוזת החוף', createdAt: now, savedAt: now, playSeconds: 0 },
    clock: { day: 1, minute: GAME_BALANCE.dayStartMinute, speed: 1 },
    finance: { money: GAME_BALANCE.startMoney },
    rating: { stars: 1, score: 50 },
    layout,
    rooms,
    pricing,
    unlocks: ['lobby', 'corridor', 'room_standard', 'bathroom', 'garden'],
    settings: { view: 'interior', viewFloor: 0 },
    nextId: ids.nextId,
  };
}
