import { Graphics } from 'pixi.js';
import { AREA_TYPES, type FloorFinish } from '../data/catalog';
import type { WallSegment } from '../sim/hotel/layout';
import type { Area, Building, Layout } from '../state/types';
import { box, faceX, faceY, hash, iso, mix, quad, rectZ, shade, type P } from './iso';

export const WALL_T = 0.14;
export const H_BACK = 3.0;
export const H_INTERIOR = 1.05;
export const H_FRONT = 0.42;
export const WALL_CAP = 0x3b2f27;
export const PLINTH = 0.16;

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------

const FINISH: Record<FloorFinish, { a: number; b: number }> = {
  marble: { a: 0xf1eadc, b: 0xe5dccb },
  carpet: { a: 0xcdb99a, b: 0xc6b192 },
  wood: { a: 0xb8834f, b: 0xa8743f },
  tile: { a: 0xeceae5, b: 0xdcd9d2 },
  runner: { a: 0x9c6a43, b: 0x8e5e39 },
  stone: { a: 0xe2d6bf, b: 0xd6c8ad },
  deck: { a: 0xa8784b, b: 0x9a6b40 },
};

export function drawAreaFloor(g: Graphics, area: Area, z: number): void {
  const def = AREA_TYPES[area.type];
  const { x, y, w, d } = area;
  const f = FINISH[def.floor];
  switch (def.floor) {
    case 'marble': {
      for (let j = 0; j < d; j++)
        for (let i = 0; i < w; i++) {
          const v = hash(x + i, y + j) * 0.05;
          rectZ(g, x + i, y + j, 1, 1, z, shade((i + j) % 2 ? f.a : f.b, 0.98 + v));
          if (hash(x + i, y + j, 7) > 0.55) {
            const a = iso(x + i + hash(i, j, 1), y + j + 0.1, z);
            const b = iso(x + i + hash(i, j, 2) * 0.6 + 0.2, y + j + 0.9, z);
            g.moveTo(a.x, a.y).bezierCurveTo(a.x + 6, a.y + 3, b.x - 6, b.y - 2, b.x, b.y).stroke({ color: 0xc9bfae, width: 0.7, alpha: 0.6 });
          }
        }
      gridLines(g, x, y, w, d, z, 1, 0xd2c6b0, 0.7);
      // Inlaid border band
      const m = 0.45, bw = 0.18;
      ring(g, x + m, y + m, w - 2 * m, d - 2 * m, bw, z, 0x2f4d47);
      ring(g, x + m + bw, y + m + bw, w - 2 * m - 2 * bw, d - 2 * m - 2 * bw, 0.04, z, 0xc8a45d);
      break;
    }
    case 'carpet': {
      rectZ(g, x, y, w, d, z, f.a);
      for (let j = 0; j < d * 4; j++)
        for (let i = 0; i < w * 4; i++)
          if (hash(x * 4 + i, y * 4 + j) > 0.78) rectZ(g, x + i / 4, y + j / 4, 0.25, 0.25, z, f.b, 0.55);
      break;
    }
    case 'wood':
    case 'deck': {
      const pw = 0.25;
      for (let j = 0; j < d / pw; j++) {
        let px = 0;
        let k = 0;
        while (px < w) {
          const len = Math.min(w - px, 1.2 + hash(x, y, j, k) * 1.6);
          rectZ(g, x + px, y + j * pw, len, pw, z, mix(f.a, f.b, hash(j, k, x)));
          px += len;
          k++;
        }
      }
      gridLines(g, x, y, w, d, z, pw, shade(f.b, 0.75), 0.35, 'y');
      break;
    }
    case 'tile': {
      for (let j = 0; j < d * 3; j++)
        for (let i = 0; i < w * 3; i++) rectZ(g, x + i / 3, y + j / 3, 1 / 3, 1 / 3, z, (i + j) % 2 ? f.a : f.b);
      gridLines(g, x, y, w, d, z, 1 / 3, 0xc4c0b8, 0.5);
      break;
    }
    case 'runner': {
      // Polished wood with a burgundy runner and gold borders
      for (let i = 0; i < w * 4; i++) rectZ(g, x + i / 4, y, 0.25, d, z, mix(f.a, f.b, hash(i, y)));
      const inset = 0.32;
      const ry = w >= d ? y + inset : y;
      const rx = w >= d ? x : x + inset;
      const rw = w >= d ? w : w - 2 * inset;
      const rd = w >= d ? d - 2 * inset : d;
      rectZ(g, rx, ry, rw, rd, z, 0x6e1f2c);
      ring(g, rx + (w >= d ? 0 : 0.06), ry + (w >= d ? 0.06 : 0), rw - (w >= d ? 0 : 0.12), rd - (w >= d ? 0.12 : 0), 0.05, z, 0xc9a45c);
      for (let i = 0; i < (w >= d ? w : d); i += 1) {
        const c = w >= d ? iso(x + i + 0.5, y + d / 2, z) : iso(x + w / 2, y + i + 0.5, z);
        g.poly([c.x, c.y - 4, c.x + 8, c.y, c.x, c.y + 4, c.x - 8, c.y]).fill({ color: 0xb48a46, alpha: 0.75 });
      }
      break;
    }
    case 'stone': {
      for (let j = 0; j < d * 2; j++)
        for (let i = 0; i < w; i++) {
          const off = j % 2 ? 0.5 : 0;
          rectZ(g, x + Math.max(0, i - off), y + j / 2, Math.min(1, w - i + off) - (i === 0 ? off : 0), 0.5, z, mix(f.a, f.b, hash(i, j, x)));
        }
      gridLines(g, x, y, w, d, z, 0.5, shade(f.b, 0.85), 0.4, 'x');
      break;
    }
  }
}

function gridLines(g: Graphics, x: number, y: number, w: number, d: number, z: number, step: number, color: number, alpha: number, only?: 'x' | 'y'): void {
  if (only !== 'y')
    for (let i = step; i < w - 1e-6; i += step) line(g, iso(x + i, y, z), iso(x + i, y + d, z), color, 0.6, alpha);
  if (only !== 'x')
    for (let j = step; j < d - 1e-6; j += step) line(g, iso(x, y + j, z), iso(x + w, y + j, z), color, 0.6, alpha);
}

function line(g: Graphics, a: P, b: P, color: number, width: number, alpha = 1): void {
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width, alpha });
}

function ring(g: Graphics, x: number, y: number, w: number, d: number, t: number, z: number, color: number): void {
  rectZ(g, x, y, w, t, z, color);
  rectZ(g, x, y + d - t, w, t, z, color);
  rectZ(g, x, y + t, t, d - 2 * t, z, color);
  rectZ(g, x + w - t, y + t, t, d - 2 * t, z, color);
}

/** Building plinth (raised foundation) and the stone step at the front. */
export function drawPlinth(g: Graphics, b: Building): void {
  box(g, b.x - 0.25, b.y - 0.25, 0, b.w + 0.5, b.d + 0.5, PLINTH, { top: 0xd9cdb6, left: 0xbfae90, right: 0xa8977a });
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

function wallHeight(s: WallSegment): number {
  return s.kind === 'back' ? H_BACK : s.kind === 'front' ? H_FRONT : H_INTERIOR;
}

function wallColorFor(layout: Layout, areaId: string | null): number {
  const a = areaId ? layout.areas.find((x) => x.id === areaId) : undefined;
  return a ? AREA_TYPES[a.type].wall : 0xf0e6d4;
}

const WINDOW_TYPES = new Set(['room_standard', 'room_deluxe', 'suite', 'corridor', 'restaurant', 'cafe', 'gym', 'spa']);

/** Draws one 1 m wall segment (or opening frame) into its own Graphics. */
export function drawWallSegment(layout: Layout, s: WallSegment, z: number, facade: number): Graphics {
  const g = new Graphics();
  const h = wallHeight(s);
  const t = WALL_T;
  const visibleArea = s.kind === 'front' ? null : s.plus; // the area whose side of the wall we see
  const paint = s.kind === 'front' ? facade : wallColorFor(layout, visibleArea);
  const areaType = visibleArea ? layout.areas.find((a) => a.id === visibleArea)?.type : undefined;

  if (s.opening) {
    if (s.kind === 'back') {
      // Lintel above a doorway in a tall wall.
      drawWallBox(g, s, z + 2.25, h - 2.25, t, paint);
    }
    // Door frame posts / threshold
    const frame = s.opening === 'entrance' ? 0xc9a45c : 0x6b4a2f;
    const postH = s.kind === 'back' ? 2.25 : Math.min(2.25, h + 0.25);
    if (s.opening !== 'entrance' && s.opening !== 'arch') {
      if (s.axis === 'x') {
        rectZ(g, s.x + 0.05, s.y - 0.09, 0.9, 0.18, z + 0.005, 0x8a6a4a);
        box(g, s.x, s.y - 0.08, z, 0.06, 0.16, postH, frame);
        box(g, s.x + 0.94, s.y - 0.08, z, 0.06, 0.16, postH, frame);
      } else {
        rectZ(g, s.x - 0.09, s.y + 0.05, 0.18, 0.9, z + 0.005, 0x8a6a4a);
        box(g, s.x - 0.08, s.y, z, 0.16, 0.06, postH, frame);
        box(g, s.x - 0.08, s.y + 0.94, z, 0.16, 0.06, postH, frame);
      }
    } else if (s.opening === 'entrance') {
      if (s.axis === 'x') rectZ(g, s.x, s.y - 0.3, 1, 0.6, z + 0.004, 0x3a2f27);
    }
    return g;
  }

  drawWallBox(g, s, z, h, t, paint);
  const face = s.axis === 'x' ? faceY : faceX;
  const fy = s.axis === 'x' ? s.y + t / 2 : 0;
  const fx = s.axis === 'y' ? s.x + t / 2 : 0;
  const along = s.axis === 'x' ? s.x : s.y;
  const at = (lo: number, hgt: number, color: number, alpha = 1, a0 = 0, a1 = 1) => {
    if (s.axis === 'x') face(g, along + a0, fy, z + lo, a1 - a0, hgt, color, alpha);
    else face(g, fx, along + a0, z + lo, a1 - a0, hgt, color, alpha);
  };

  if (s.kind === 'front') {
    // Exterior stone base band.
    at(0, 0.12, shade(facade, 0.78));
    return g;
  }
  const lit = s.axis === 'x' ? 0.92 : 1.0; // north-wall faces are slightly darker than west-wall faces
  if (s.kind === 'back' || s.kind === 'interior') {
    // Wainscot panelling, chair rail and skirting
    const wains = areaType === 'bathroom' ? 0xd8d3c8 : areaType === 'lobby' ? 0x6a4c36 : areaType === 'corridor' ? 0x7a5a40 : 0xb89470;
    const wh = s.kind === 'interior' ? 0.55 : 0.95;
    at(0, wh, shade(wains, lit * 0.95));
    if (areaType !== 'bathroom') {
      for (const p of [0.12, 0.56]) at(0.18, wh - 0.34, shade(wains, lit * 1.08), 1, p, p + 0.32);
    }
    at(wh - 0.04, 0.05, 0xc9a45c);
    at(0, 0.08, shade(wains, 0.6));
  }
  if (s.kind === 'back') {
    // Crown moulding
    at(h - 0.14, 0.14, shade(paint, 0.88 * lit));
    at(h - 0.18, 0.04, 0xc9a45c, 0.8);
    const isWindow = areaType && WINDOW_TYPES.has(areaType) && (Math.floor(along) % 2 === 1 || areaType === 'corridor');
    if (isWindow) drawWindow(g, s, z, at);
    else if (areaType === 'room_standard' || areaType === 'room_deluxe' || areaType === 'suite') drawArtwork(at, along);
    else if (areaType === 'corridor') drawSconce(at);
  }
  return g;
}

function drawWallBox(g: Graphics, s: WallSegment, z: number, h: number, t: number, paint: number): void {
  if (s.axis === 'x') {
    box(g, s.x - (s.kind === 'back' ? t / 2 : 0), s.y - t / 2, z, 1 + (s.kind === 'back' ? t / 2 : 0), t, h, { top: WALL_CAP, left: shade(paint, 0.94), right: shade(paint, 0.75) });
  } else {
    box(g, s.x - t / 2, s.y, z, t, 1, h, { top: WALL_CAP, left: shade(paint, 0.8), right: shade(paint, 1.0) });
  }
}

type At = (lo: number, h: number, color: number, alpha?: number, a0?: number, a1?: number) => void;

function drawWindow(_g: Graphics, _s: WallSegment, _z: number, at: At): void {
  // Curtains, frame, glass with sky reflection, mullion and sill.
  at(0.82, 1.9, 0xf7f3ea, 1, 0.08, 0.92);
  at(0.9, 1.75, 0x9ec9e0, 1, 0.16, 0.84);
  at(1.85, 0.8, 0xbfe0f0, 1, 0.16, 0.84);
  at(1.3, 0.25, 0xd6eef8, 0.7, 0.2, 0.5);
  at(0.9, 1.75, 0xf7f3ea, 1, 0.48, 0.52);
  at(1.66, 0.04, 0xf7f3ea, 1, 0.16, 0.84);
  at(0.8, 0.07, 0xc9a45c, 1, 0.05, 0.95);
  at(0.86, 1.9, 0x8e2f3c, 1, 0.0, 0.1);
  at(0.86, 1.9, 0x8e2f3c, 1, 0.9, 1.0);
  at(2.72, 0.06, 0x6b4a2f, 1, 0.0, 1.0);
}

function drawArtwork(at: At, along: number): void {
  const palette = [0x2f5d62, 0xb5651d, 0x5e4b8b, 0x3e6b48];
  const c = palette[Math.floor(along) % palette.length];
  at(1.45, 0.75, 0xc9a45c, 1, 0.22, 0.78);
  at(1.5, 0.65, c, 1, 0.26, 0.74);
  at(1.5, 0.28, mix(c, 0xf2d7a0, 0.5), 1, 0.26, 0.74);
}

function drawSconce(at: At): void {
  at(1.75, 0.22, 0xc9a45c, 1, 0.44, 0.56);
  at(1.9, 0.12, 0xfff1c9, 1, 0.42, 0.58);
}

/** The +x / +y facades of a building storey (used for exterior view and lower floors). */
export function drawStoreyExterior(g: Graphics, b: Building, floor: number, z: number, isTop: boolean, isGround: boolean, layout: Layout): void {
  const h = 3.2;
  const facade = b.facade;
  box(g, b.x, b.y, z, b.w, b.d, h, { top: 0xbdb3a3, left: shade(facade, 0.92), right: shade(facade, 0.74) });
  const fy = (lo: number, hh: number, x0: number, x1: number, color: number, alpha = 1) =>
    quad(g, [iso(x0, b.y + b.d, z + lo), iso(x1, b.y + b.d, z + lo), iso(x1, b.y + b.d, z + lo + hh), iso(x0, b.y + b.d, z + lo + hh)], color, alpha);
  const fx = (lo: number, hh: number, y0: number, y1: number, color: number, alpha = 1) =>
    quad(g, [iso(b.x + b.w, y0, z + lo), iso(b.x + b.w, y1, z + lo), iso(b.x + b.w, y1, z + lo + hh), iso(b.x + b.w, y0, z + lo + hh)], color, alpha);

  const entrance = layout.areas.find((a) => a.buildingId === b.id && a.floor === 0 && a.doors.some((d) => d.kind === 'entrance'));
  const door = entrance?.doors.find((d) => d.kind === 'entrance');

  // Pilasters every 4 m and window bays.
  for (let i = 0; i < b.w; i += 2) {
    const x0 = b.x + i;
    if (isGround && door && x0 >= door.x - 1 && x0 < door.x + (door.width ?? 1) + 1) continue;
    if (isGround) {
      fy(0.35, 2.45, x0 + 0.2, x0 + 1.8, 0x2c4656);
      fy(0.4, 2.35, x0 + 0.25, x0 + 1.75, 0x6f9fb6);
      fy(1.9, 0.8, x0 + 0.25, x0 + 1.75, 0x9cc7dc, 0.8);
      fy(0.35, 2.45, x0 + 0.97, x0 + 1.03, 0x2c4656);
    } else {
      fy(0.75, 1.95, x0 + 0.35, x0 + 1.65, 0x37515f);
      fy(0.8, 1.85, x0 + 0.4, x0 + 1.6, 0x7fb0c6);
      fy(1.95, 0.7, x0 + 0.4, x0 + 1.6, 0xb3d6e6, 0.85);
      // Balcony slab + glass rail
      fy(0.66, 0.1, x0 + 0.15, x0 + 1.85, 0xe9e1d2);
      fy(0.76, 0.55, x0 + 0.2, x0 + 1.8, 0xcfe6ef, 0.35);
      fy(1.29, 0.04, x0 + 0.2, x0 + 1.8, 0xc9a45c);
    }
  }
  for (let j = 0; j < b.d; j += 2) {
    const y0 = b.y + j;
    if (isGround) {
      fx(0.35, 2.45, y0 + 0.2, y0 + 1.8, 0x22394a);
      fx(0.4, 2.35, y0 + 0.25, y0 + 1.75, 0x5a8aa3);
      fx(1.9, 0.8, y0 + 0.25, y0 + 1.75, 0x84b4cc, 0.8);
    } else {
      fx(0.75, 1.95, y0 + 0.35, y0 + 1.65, 0x2d4552);
      fx(0.8, 1.85, y0 + 0.4, y0 + 1.6, 0x6a9bb2);
      fx(1.95, 0.7, y0 + 0.4, y0 + 1.6, 0x98c3d8, 0.85);
      fx(0.66, 0.1, y0 + 0.15, y0 + 1.85, 0xd6cdbd);
    }
  }
  for (let i = 0; i <= b.w; i += 4) fy(0, h, b.x + i - (i === b.w ? 0.3 : 0), b.x + i + (i === 0 ? 0.3 : i === b.w ? 0 : 0.15), shade(facade, 1.04));
  // Cornice band between storeys
  fy(h - 0.22, 0.22, b.x, b.x + b.w, shade(facade, 1.06));
  fx(h - 0.22, 0.22, b.y, b.y + b.d, shade(facade, 0.84));
  fy(h - 0.26, 0.04, b.x, b.x + b.w, 0xc9a45c);
  fx(h - 0.26, 0.04, b.y, b.y + b.d, 0xa88a4c);
  if (isGround) {
    fy(0, 0.3, b.x, b.x + b.w, shade(facade, 0.7));
    fx(0, 0.3, b.y, b.y + b.d, shade(facade, 0.58));
    if (door) {
      const x0 = door.x, x1 = door.x + (door.width ?? 1);
      fy(0, 2.7, x0 - 0.1, x1 + 0.1, 0xc9a45c);
      fy(0, 2.6, x0, x1, 0x1e2f3a);
      fy(0.05, 2.45, x0 + 0.08, (x0 + x1) / 2 - 0.04, 0x6c98ad, 0.9);
      fy(0.05, 2.45, (x0 + x1) / 2 + 0.04, x1 - 0.08, 0x6c98ad, 0.9);
    }
  }
  void floor;
  if (isTop) {
    // Parapet & roof
    box(g, b.x, b.y, z + h, b.w, b.d, 0.05, { top: 0xc9c2b5 });
    box(g, b.x, b.y, z + h, b.w, 0.25, 0.55, 0xe6dccb);
    box(g, b.x, b.y, z + h, 0.25, b.d, 0.55, 0xe6dccb);
    // Roof terrace: teak deck, planters, skylights and plant room
    const rz = z + h + 0.05;
    for (let i = 0; i < (b.w - 1) * 4; i++) rectZ(g, b.x + 0.5 + i / 4, b.y + b.d * 0.45, 0.25, b.d * 0.55 - 0.5, rz, i % 2 ? 0xa8784b : 0x9a6b40);
    box(g, b.x + 1.2, b.y + 1.2, rz, 3.2, 2.2, 1.1, { top: 0xb9b2a6, left: 0xd8cfbf, right: 0xc4bba9 });
    box(g, b.x + 1.6, b.y + 1.5, rz + 1.1, 0.9, 0.7, 0.35, 0x8c939a);
    for (const sx of [6.5, 9.5, 12.5]) if (sx + 1.6 < b.w) {
      box(g, b.x + sx, b.y + 2, rz, 1.6, 1.6, 0.25, 0xe2d9c9);
      rectZ(g, b.x + sx + 0.15, b.y + 2.15, 1.3, 1.3, rz + 0.26, 0x7fb3cc);
      rectZ(g, b.x + sx + 0.15, b.y + 2.15, 0.5, 1.3, rz + 0.261, 0xbfe0ee, 0.6);
    }
    for (let i = 1; i < b.w - 1; i += 3) {
      box(g, b.x + i, b.y + b.d - 1.1, rz, 1.6, 0.6, 0.45, 0xd9cfbd);
      for (let k = 0; k < 5; k++) {
        const p = iso(b.x + i + 0.2 + k * 0.3, b.y + b.d - 0.8, rz + 0.5);
        g.circle(p.x, p.y - 3, 5).fill({ color: k % 2 ? 0x4b8f50 : 0x3d7f47 });
      }
    }
    for (let i = 2.5; i < b.w - 2; i += 4.5) {
      const c = iso(b.x + i, b.y + b.d * 0.7, rz);
      g.rect(c.x - 0.8, c.y - 62, 1.6, 62).fill({ color: 0xe9e1d2 });
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
        g.poly([c.x, c.y - 70, c.x + Math.cos(a0) * 34, c.y - 58 + Math.sin(a0) * 15, c.x + Math.cos(a1) * 34, c.y - 58 + Math.sin(a1) * 15]).fill({ color: k % 2 ? 0xf4f1ea : 0xe4ddd0 });
      }
    }
    box(g, b.x + 0.25, b.y + b.d - 0.25, z + h, b.w - 0.25, 0.25, 0.55, 0xe6dccb);
    box(g, b.x + b.w - 0.25, b.y + 0.25, z + h, 0.25, b.d - 0.5, 0.55, 0xe6dccb);
    fy(h + 0.45, 0.05, b.x, b.x + b.w, 0xc9a45c);
    fx(h + 0.45, 0.05, b.y, b.y + b.d, 0xa88a4c);
  }
}
