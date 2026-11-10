import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data/initialState';
import { addArea, addFloor, addGuestRoom, computeWalls, guestRooms, validateArea, validateLayout } from '../src/sim/hotel/layout';

describe('initial hotel', () => {
  const s = createInitialState();
  it('is a valid layout', () => {
    expect(validateLayout(s.layout)).toEqual([]);
  });
  it('has a lobby and 4 guest rooms with bathrooms', () => {
    expect(s.layout.areas.filter((a) => a.type === 'lobby')).toHaveLength(1);
    const rooms = guestRooms(s.layout);
    expect(rooms).toHaveLength(4);
    for (const r of rooms) expect(s.layout.areas.some((a) => a.parentId === r.id && a.type === 'bathroom')).toBe(true);
    expect(Object.keys(s.rooms)).toHaveLength(4);
  });
  it('derives walls with doors, entrance and arch', () => {
    const walls = computeWalls(s.layout, 'b1', 0);
    expect(walls.filter((w) => w.opening === 'entrance')).toHaveLength(4);
    expect(walls.filter((w) => w.opening === 'arch')).toHaveLength(4);
    // 4 room doors + 4 bathroom doors
    expect(walls.filter((w) => w.opening === 'door')).toHaveLength(8);
    expect(walls.some((w) => w.kind === 'back')).toBe(true);
    expect(walls.some((w) => w.kind === 'front')).toBe(true);
  });
});

describe('expansion system', () => {
  it('rejects overlapping and out-of-building areas', () => {
    const s = createInitialState();
    expect(validateArea(s.layout, { type: 'room_standard', buildingId: 'b1', floor: 0, x: 12, y: 8, w: 4, d: 5, level: 1 })).toBe('overlap');
    expect(validateArea(s.layout, { type: 'room_standard', buildingId: 'b1', floor: 0, x: 30, y: 8, w: 4, d: 5, level: 1 })).toBe('outside-building');
    expect(validateArea(s.layout, { type: 'room_standard', buildingId: 'b1', floor: 1, x: 12, y: 8, w: 4, d: 5, level: 1 })).toBe('bad-floor');
    expect(validateArea(s.layout, { type: 'nope', buildingId: 'b1', floor: 0, x: 12, y: 8, w: 4, d: 5, level: 1 })).toBe('unknown-type');
  });
  it('adds a new floor with rooms and a corridor', () => {
    const s = createInitialState();
    const ids = { nextId: s.nextId };
    const f = addFloor(s.layout, 'b1');
    expect(f).toBe(1);
    for (let i = 0; i < 4; i++) addGuestRoom(s.layout, ids, { buildingId: 'b1', floor: 1, x: 12 + i * 4, y: 8, label: `20${i + 1}` });
    addArea(s.layout, ids, { type: 'corridor', buildingId: 'b1', floor: 1, x: 12, y: 13, w: 16, d: 2, level: 1, doors: [] });
    expect(guestRooms(s.layout)).toHaveLength(8);
    expect(validateLayout(s.layout)).toEqual([]);
    expect(computeWalls(s.layout, 'b1', 1).length).toBeGreaterThan(0);
  });
});
