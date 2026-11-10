import { Container, Graphics, Text } from 'pixi.js';
import type { Decor, Layout, Surface } from '../state/types';
import { box, boxShadow, hash, iso, mix, quad, rectZ, shade, shadow } from './iso';

export type Animator = (time: number, night: number) => void;

export interface DecorObject {
  view: Container;
  footprint: { x0: number; y0: number; x1: number; y1: number };
  /** Light sources (world coords) that glow at night. */
  lights: { x: number; y: number; z: number; r: number; color: number }[];
  animate?: Animator;
}

const GRASS = [0x6f9a4a, 0x76a250, 0x6a9446, 0x7aa755];
const SLAB = 1.4;

/** The lot as a floating diorama slab: grass top, soil and rock sides. */
export function drawGround(layout: Layout): Graphics {
  const g = new Graphics();
  const { w, d } = layout.lot;
  // Slab sides (soil strata)
  quad(g, [iso(0, d, 0), iso(w, d, 0), iso(w, d, -SLAB), iso(0, d, -SLAB)], 0x7a5a3c);
  quad(g, [iso(w, 0, 0), iso(w, d, 0), iso(w, d, -SLAB), iso(w, 0, -SLAB)], 0x5e442d);
  quad(g, [iso(0, d, -0.25), iso(w, d, -0.25), iso(w, d, 0), iso(0, d, 0)], 0x557a36);
  quad(g, [iso(w, 0, -0.25), iso(w, d, -0.25), iso(w, d, 0), iso(w, 0, 0)], 0x47682c);
  for (let i = 0; i < 26; i++) {
    const t = hash(i, 3) * w, s = 0.3 + hash(i, 4) * 0.5;
    const a = iso(t, d, -0.5 - hash(i, 5) * 0.7);
    g.ellipse(a.x, a.y, 10 * s + 4, 4 * s + 2).fill({ color: 0x6b4c33, alpha: 0.8 });
    const b = iso(w, hash(i, 6) * d, -0.5 - hash(i, 7) * 0.7);
    g.ellipse(b.x, b.y, 10 * s + 4, 4 * s + 2).fill({ color: 0x533b27, alpha: 0.8 });
  }
  // Grass with gentle colour variation
  for (let y = 0; y < d; y++)
    for (let x = 0; x < w; x++) rectZ(g, x, y, 1, 1, 0, GRASS[Math.floor(hash(x, y) * GRASS.length)]);
  for (let i = 0; i < 900; i++) {
    const x = hash(i, 11) * w, y = hash(i, 12) * d;
    const p = iso(x, y, 0);
    g.moveTo(p.x, p.y).lineTo(p.x - 1, p.y - 3).moveTo(p.x + 1.5, p.y).lineTo(p.x + 2, p.y - 3.5).stroke({ color: 0x4f7a34, width: 0.8, alpha: 0.6 });
  }
  return g;
}

export function drawSurface(g: Graphics, s: Surface, time = 0): void {
  const { x, y, w, d } = s;
  switch (s.kind) {
    case 'sand':
      rectZ(g, x, y, w, d, 0.005, 0xe9d5a6);
      for (let i = 0; i < w * d * 3; i++) {
        const p = iso(x + hash(i, 21) * w, y + hash(i, 22) * d, 0.006);
        g.circle(p.x, p.y, 0.8).fill({ color: hash(i, 23) > 0.5 ? 0xd7bf8c : 0xf6e7c2 });
      }
      rectZ(g, x, y, w, 0.3, 0.006, 0x8fa860, 0.6);
      break;
    case 'water':
      drawWater(g, s, time);
      break;
    case 'plaza':
      for (let j = 0; j < d * 2; j++)
        for (let i = 0; i < w * 2; i++) rectZ(g, x + i / 2, y + j / 2, 0.5, 0.5, 0.01, mix(0xe6dccb, 0xd6c9b2, hash(i, j, 5)));
      for (let i = 0; i <= w * 2; i++) line(g, iso(x + i / 2, y, 0.012), iso(x + i / 2, y + d, 0.012), 0xc4b59b, 0.5);
      for (let j = 0; j <= d * 2; j++) line(g, iso(x, y + j / 2, 0.012), iso(x + w, y + j / 2, 0.012), 0xc4b59b, 0.5);
      break;
    case 'drive': {
      box(g, x, y, 0, w, d, 0.04, { top: 0x4c5157, left: 0x3a3e43, right: 0x33373b });
      rectZ(g, x, y, w, 0.15, 0.045, 0xd9d4ca);
      rectZ(g, x, y + d - 0.15, w, 0.15, 0.045, 0xd9d4ca);
      const horiz = w >= d;
      for (let i = 0.5; i < (horiz ? w : d) - 0.5; i += 2) {
        if (horiz) rectZ(g, x + i, y + d / 2 - 0.05, 1, 0.1, 0.046, 0xf2efe6);
        else rectZ(g, x + w / 2 - 0.05, y + i, 0.1, 1, 0.046, 0xf2efe6);
      }
      break;
    }
    case 'path':
      rectZ(g, x, y, w, d, 0.01, 0xd8ccb4);
      for (let j = 0; j < d * 2; j++)
        for (let i = 0; i < w * 2; i++)
          rectZ(g, x + i / 2 + 0.03, y + j / 2 + 0.03, 0.44, 0.44, 0.012, mix(0xcfc0a2, 0xe2d6bf, hash(i, j, x, y)));
      break;
    case 'flowerbed': {
      box(g, x, y, 0, w, d, 0.12, { top: 0x5a3f2a, left: 0xbdb3a3, right: 0xa79d8d });
      const cols = [0xe86a8a, 0xf2c14e, 0xffffff, 0xb46fd1, 0xff8c69];
      for (let i = 0; i < w * d * 9; i++) {
        const p = iso(x + 0.1 + hash(i, 31) * (w - 0.2), y + 0.1 + hash(i, 32) * (d - 0.2), 0.14);
        g.circle(p.x, p.y - 2, 2.2).fill({ color: 0x3f7a3a });
        g.circle(p.x, p.y - 3.5, 1.4).fill({ color: cols[i % cols.length] });
      }
      break;
    }
    case 'lawn':
      rectZ(g, x, y, w, d, 0.004, 0x84b05c);
      break;
  }
}

function drawWater(g: Graphics, s: Surface, time: number): void {
  const { x, y, w, d } = s;
  quad(g, [iso(x, y + d, -0.3), iso(x + w, y + d, -0.3), iso(x + w, y + d, -SLAB), iso(x, y + d, -SLAB)], 0x1d5f80);
  rectZ(g, x, y, w, d, -0.3, 0x2b8db3);
  rectZ(g, x, y + 0.6, w, d - 0.6, -0.3, 0x2380a6, 0.8);
  rectZ(g, x, y + 1.6, w, d - 1.6, -0.3, 0x1c6f96, 0.8);
  // Shore foam (animated)
  const foam = 0.25 + Math.sin(time * 0.9) * 0.12;
  rectZ(g, x, y, w, foam, -0.29, 0xf4fbff, 0.85);
  for (let i = 0; i < 28; i++) {
    const px = x + ((hash(i, 41) * w + time * 0.35 * (0.5 + hash(i, 42))) % w);
    const py = y + 0.6 + hash(i, 43) * (d - 0.8);
    const a = iso(px, py, -0.29), b = iso(px + 0.9, py, -0.29);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xbfe8f7, width: 1, alpha: 0.35 + 0.35 * Math.sin(time * 1.6 + i) ** 2 });
  }
}

function line(g: Graphics, a: { x: number; y: number }, b: { x: number; y: number }, color: number, width: number): void {
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width });
}

// ---------------------------------------------------------------------------
// Decor
// ---------------------------------------------------------------------------

const PALM_GREENS = [0x3f8a3f, 0x4e9a45, 0x357a36];

function palm(dec: Decor): DecorObject {
  const view = new Container();
  const trunk = new Graphics();
  const crown = new Graphics();
  view.addChild(trunk, crown);
  const v = dec.variant ?? 0;
  const h = 5.2 + v * 0.7;
  shadow(trunk, dec.x + 0.6, dec.y + 0.4, 2.6, 1.6, 0, 0.14);
  const lean = (v - 1) * 10;
  const base = iso(dec.x, dec.y, 0);
  const top = { x: base.x + lean, y: base.y - h * 36 };
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const bx = (t: number) => base.x + lean * t * t;
    const by = (t: number) => base.y - h * 36 * t;
    const r0 = 4.2 - t0 * 1.6, r1 = 4.2 - t1 * 1.6;
    trunk.poly([bx(t0) - r0, by(t0), bx(t0) + r0, by(t0), bx(t1) + r1, by(t1), bx(t1) - r1, by(t1)]).fill({ color: i % 2 ? 0x8a6a48 : 0x7a5c3d });
  }
  crown.position.set(top.x, top.y);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + v;
    const len = 46 + ((i * 13) % 9);
    const tx = Math.cos(a) * len, ty = Math.sin(a) * len * 0.45 + 18;
    const mx = tx * 0.5, my = Math.sin(a) * len * 0.22 - 14;
    const nx = -Math.sin(a) * 7, ny = Math.cos(a) * 3.5;
    crown.moveTo(0, 0).quadraticCurveTo(mx + nx, my + ny, tx, ty).quadraticCurveTo(mx - nx, my - ny, 0, 0).fill({ color: PALM_GREENS[i % 3] });
    crown.moveTo(0, 0).quadraticCurveTo(mx, my, tx, ty).stroke({ color: 0x2c5f2c, width: 0.8, alpha: 0.7 });
  }
  crown.circle(0, 2, 4).fill({ color: 0x5b4127 });
  const phase = hash(dec.x, dec.y) * 6;
  return {
    view,
    footprint: { x0: dec.x - 0.3, y0: dec.y - 0.3, x1: dec.x + 0.3, y1: dec.y + 0.3 },
    lights: [],
    animate: (t) => {
      crown.rotation = Math.sin(t * 0.8 + phase) * 0.035;
      crown.skew.x = Math.sin(t * 0.6 + phase) * 0.04;
    },
  };
}

function tree(dec: Decor): DecorObject {
  const g = new Graphics();
  const v = dec.variant ?? 0;
  shadow(g, dec.x + 0.5, dec.y + 0.4, 3.2, 2.4, 0, 0.16);
  box(g, dec.x - 0.08, dec.y - 0.08, 0, 0.16, 0.16, 1.5, 0x7a5a3c);
  const c = iso(dec.x, dec.y, 2.35 + v * 0.3);
  const greens = v ? [0x2f6e3a, 0x3c8044, 0x4f9550] : [0x3b6e2e, 0x4b8238, 0x5e9844];
  const blobs = [[-16, 10, 22], [16, 10, 22], [0, -6, 27], [-10, -20, 19], [12, -18, 19], [0, 16, 21]];
  blobs.forEach(([dx, dy, r], i) => g.circle(c.x + dx, c.y + dy, r).fill({ color: greens[i % 3] }));
  blobs.forEach(([dx, dy, r]) => g.circle(c.x + dx - r * 0.3, c.y + dy - r * 0.35, r * 0.45).fill({ color: 0x8cbf68, alpha: 0.35 }));
  return { view: g, footprint: { x0: dec.x - 0.5, y0: dec.y - 0.5, x1: dec.x + 0.5, y1: dec.y + 0.5 }, lights: [] };
}

function bush(dec: Decor): DecorObject {
  const g = new Graphics();
  shadow(g, dec.x + 0.2, dec.y + 0.2, 1.2, 0.9, 0, 0.15);
  const c = iso(dec.x, dec.y, 0.35);
  const cols = [0x3f7a3a, 0x4d8b43, 0x5a9a4c];
  g.circle(c.x - 7, c.y + 2, 9).fill({ color: cols[0] });
  g.circle(c.x + 7, c.y + 2, 9).fill({ color: cols[1] });
  g.circle(c.x, c.y - 5, 10).fill({ color: cols[2] });
  if ((dec.variant ?? 0) === 1) for (let i = 0; i < 6; i++) g.circle(c.x - 8 + hash(i, dec.x) * 16, c.y - 8 + hash(i, dec.y) * 12, 1.8).fill({ color: 0xf3b6c8 });
  return { view: g, footprint: { x0: dec.x - 0.4, y0: dec.y - 0.4, x1: dec.x + 0.4, y1: dec.y + 0.4 }, lights: [] };
}

function lamp(dec: Decor): DecorObject {
  const g = new Graphics();
  shadow(g, dec.x, dec.y, 0.5, 0.5, 0, 0.2);
  box(g, dec.x - 0.1, dec.y - 0.1, 0, 0.2, 0.2, 0.25, 0x2a2a2a);
  box(g, dec.x - 0.04, dec.y - 0.04, 0.25, 0.08, 0.08, 2.6, 0x2a2a2a);
  const top = iso(dec.x, dec.y, 3.0);
  g.poly([top.x - 6, top.y - 4, top.x + 6, top.y - 4, top.x + 4, top.y + 8, top.x - 4, top.y + 8]).fill({ color: 0xfff0c2 });
  g.poly([top.x - 7, top.y - 4, top.x, top.y - 10, top.x + 7, top.y - 4]).fill({ color: 0x2a2a2a });
  return { view: g, footprint: { x0: dec.x - 0.15, y0: dec.y - 0.15, x1: dec.x + 0.15, y1: dec.y + 0.15 }, lights: [{ x: dec.x, y: dec.y, z: 2.9, r: 70, color: 0xffd58a }] };
}

function bench(dec: Decor): DecorObject {
  const g = new Graphics();
  const x = dec.x - 0.7, y = dec.y - 0.25;
  boxShadow(g, x, y, 1.4, 0.5);
  box(g, x + 0.05, y + 0.05, 0, 0.08, 0.4, 0.42, 0x2a2a2a);
  box(g, x + 1.27, y + 0.05, 0, 0.08, 0.4, 0.42, 0x2a2a2a);
  for (let i = 0; i < 4; i++) box(g, x, y + i * 0.125, 0.42, 1.4, 0.1, 0.04, 0xa8784b);
  box(g, x, y, 0.46, 1.4, 0.08, 0.45, 0x9a6b40);
  return { view: g, footprint: { x0: x, y0: y, x1: x + 1.4, y1: y + 0.5 }, lights: [] };
}

function fountain(dec: Decor): DecorObject {
  const view = new Container();
  const g = new Graphics();
  const water = new Graphics();
  view.addChild(g, water);
  const c = iso(dec.x, dec.y, 0);
  const R = 2.0;
  const ex = R * 32 * Math.SQRT2, ey = R * 16 * Math.SQRT2;
  g.ellipse(c.x + 6, c.y + 6, ex + 10, ey + 6).fill({ color: 0x1a1208, alpha: 0.15 });
  // Basin
  g.ellipse(c.x, c.y, ex + 6, ey + 3).fill({ color: 0xbdb19c });
  g.rect(c.x - ex - 6, c.y - 16, (ex + 6) * 2, 16).fill({ color: 0xd9cfbd });
  g.ellipse(c.x, c.y - 16, ex + 6, ey + 3).fill({ color: 0xece4d6 });
  g.ellipse(c.x, c.y - 16, ex - 2, ey - 2).fill({ color: 0x3f9cc0 });
  g.ellipse(c.x, c.y - 16, ex - 10, ey - 6).fill({ color: 0x4fb0d2, alpha: 0.7 });
  // Tiers
  g.rect(c.x - 5, c.y - 60, 10, 44).fill({ color: 0xe2d9c9 });
  g.ellipse(c.x, c.y - 56, 26, 11).fill({ color: 0xece4d6 });
  g.ellipse(c.x, c.y - 57, 22, 8.5).fill({ color: 0x4fb0d2 });
  g.rect(c.x - 3, c.y - 84, 6, 26).fill({ color: 0xe2d9c9 });
  g.ellipse(c.x, c.y - 82, 13, 5.5).fill({ color: 0xece4d6 });
  g.ellipse(c.x, c.y - 83, 10, 4).fill({ color: 0x4fb0d2 });
  g.circle(c.x, c.y - 90, 3).fill({ color: 0xc9a45c });
  const drops = Array.from({ length: 34 }, (_, i) => ({ a: (i / 34) * Math.PI * 2, s: 0.6 + hash(i, 51) * 0.6, o: hash(i, 52) }));
  return {
    view,
    footprint: { x0: dec.x - R, y0: dec.y - R, x1: dec.x + R, y1: dec.y + R },
    lights: [{ x: dec.x, y: dec.y, z: 0.6, r: 90, color: 0x9fe3ff }],
    animate: (t) => {
      water.clear();
      for (const dr of drops) {
        const p = (t * dr.s + dr.o) % 1;
        const r1 = 22 * p, top = p < 0.5 ? p * 2 : 1;
        const x = c.x + Math.cos(dr.a) * r1;
        const y = c.y - 57 + Math.sin(dr.a) * r1 * 0.4 - Math.sin(p * Math.PI) * 10 + top * 0 + p * 30 * p;
        water.circle(x, y, 1.3).fill({ color: 0xdff6ff, alpha: 0.85 - p * 0.5 });
        const x2 = c.x + Math.cos(dr.a + 0.3) * (12 + 46 * p);
        const y2 = c.y - 82 + Math.sin(dr.a + 0.3) * (5 + 20 * p) - Math.sin(p * Math.PI) * 8 + p * p * 60;
        if (y2 < c.y - 14) water.circle(x2, y2, 1.1).fill({ color: 0xffffff, alpha: 0.7 - p * 0.4 });
      }
      for (let k = 0; k < 2; k++) {
        const p = (t * 0.4 + k * 0.5) % 1;
        water.ellipse(c.x, c.y - 16, (ex - 12) * p + 10, (ey - 6) * p + 4).stroke({ color: 0xffffff, width: 1, alpha: 0.4 * (1 - p) });
      }
    },
  };
}

const UMBRELLA_COLS = [0xf4f1ea, 0x1f3a4d, 0xc9a45c];

function umbrella(dec: Decor): DecorObject {
  const g = new Graphics();
  shadow(g, dec.x + 0.4, dec.y + 0.3, 2.6, 1.8, 0, 0.14);
  box(g, dec.x - 0.03, dec.y - 0.03, 0, 0.06, 0.06, 2.3, 0xe0d6c4);
  const c = iso(dec.x, dec.y, 2.35);
  const col = UMBRELLA_COLS[(dec.variant ?? 0) % 3];
  const r = 42;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    g.poly([c.x, c.y - 10, c.x + Math.cos(a0) * r, c.y + Math.sin(a0) * r * 0.45, c.x + Math.cos(a1) * r, c.y + Math.sin(a1) * r * 0.45])
      .fill({ color: i % 2 ? col : shade(col, 0.88) });
  }
  return { view: g, footprint: { x0: dec.x - 0.1, y0: dec.y - 0.1, x1: dec.x + 0.1, y1: dec.y + 0.1 }, lights: [] };
}

function lounger(dec: Decor): DecorObject {
  const g = new Graphics();
  const x = dec.x - 0.3, y = dec.y - 0.9;
  boxShadow(g, x, y, 0.6, 1.8);
  box(g, x, y, 0.2, 0.6, 1.8, 0.08, 0xf4f1ea);
  for (const [px, py] of [[0.05, 0.05], [0.5, 0.05], [0.05, 1.7], [0.5, 1.7]]) box(g, x + px, y + py, 0, 0.05, 0.05, 0.2, 0x8a6a48);
  quad(g, [iso(x, y + 0.5, 0.28), iso(x + 0.6, y + 0.5, 0.28), iso(x + 0.6, y + 0.05, 0.75), iso(x, y + 0.05, 0.75)], 0xffffff);
  box(g, x + 0.05, y + 0.6, 0.28, 0.5, 0.9, 0.03, 0x2f7fa6);
  return { view: g, footprint: { x0: x, y0: y, x1: x + 0.6, y1: y + 1.8 }, lights: [] };
}

const CAR_COLS = [0x1f2a36, 0xf2f2f0, 0x8e2f3c];

function car(dec: Decor): DecorObject {
  const g = new Graphics();
  const x = dec.x - 2.2, y = dec.y - 0.9, w = 4.4, d = 1.8;
  const col = CAR_COLS[(dec.variant ?? 0) % 3];
  boxShadow(g, x, y, w, d, 0, 0.3, 0.2);
  for (const px of [0.7, 3.3]) for (const py of [0, d - 0.2]) box(g, x + px, y + py, 0, 0.6, 0.2, 0.55, 0x1a1a1a);
  box(g, x, y, 0.25, w, d, 0.55, col);
  box(g, x + 1.2, y + 0.12, 0.8, 2.1, d - 0.24, 0.5, { top: shade(col, 1.05), left: 0x2b3d4c, right: 0x22313d });
  rectZ(g, x + 1.25, y + 0.15, 2.0, d - 0.3, 1.31, shade(col, 1.08));
  // Headlights
  quad(g, [iso(x + w, y + 0.15, 0.55), iso(x + w, y + 0.45, 0.55), iso(x + w, y + 0.45, 0.68), iso(x + w, y + 0.15, 0.68)], 0xfff5d0);
  quad(g, [iso(x + w, y + d - 0.45, 0.55), iso(x + w, y + d - 0.15, 0.55), iso(x + w, y + d - 0.15, 0.68), iso(x + w, y + d - 0.45, 0.68)], 0xfff5d0);
  return { view: g, footprint: { x0: x, y0: y, x1: x + w, y1: y + d }, lights: [] };
}

function flag(dec: Decor): DecorObject {
  const view = new Container();
  const g = new Graphics();
  const cloth = new Graphics();
  view.addChild(g, cloth);
  shadow(g, dec.x, dec.y, 0.4, 0.4, 0, 0.2);
  box(g, dec.x - 0.04, dec.y - 0.04, 0, 0.08, 0.08, 6, 0xe6e6e6);
  const top = iso(dec.x, dec.y, 5.9);
  const col = dec.variant ? 0x1f3a4d : 0xc9a45c;
  return {
    view,
    footprint: { x0: dec.x - 0.1, y0: dec.y - 0.1, x1: dec.x + 0.1, y1: dec.y + 0.1 },
    lights: [],
    animate: (t) => {
      cloth.clear();
      const pts: number[] = [];
      const L = 34, H = 20;
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push(top.x + 2 + u * L, top.y + Math.sin(t * 4 + u * 5) * 3 * u);
      }
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        pts.push(top.x + 2 + u * L, top.y + H + Math.sin(t * 4 + u * 5) * 3 * u);
      }
      cloth.poly(pts).fill({ color: col });
      cloth.circle(top.x + 2 + L * 0.45, top.y + H / 2 + Math.sin(t * 4 + 2.2) * 1.3, 4).stroke({ color: dec.variant ? 0xc9a45c : 0xffffff, width: 1.2 });
    },
  };
}

function hotelSign(dec: Decor, hotelName: string): DecorObject {
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  const x = dec.x - 1.4, y = dec.y - 0.3;
  boxShadow(g, x, y, 2.8, 0.6, 0, 0.25);
  box(g, x - 0.2, y - 0.1, 0, 3.2, 0.8, 0.3, 0xd6ccba);
  box(g, x, y, 0.3, 2.8, 0.6, 1.2, { top: 0x23364a, left: 0x1d2b3a, right: 0x16212d });
  quad(g, [iso(x + 0.1, y + 0.601, 0.42), iso(x + 2.7, y + 0.601, 0.42), iso(x + 2.7, y + 0.601, 0.44), iso(x + 0.1, y + 0.601, 0.44)], 0xc9a45c);
  quad(g, [iso(x + 0.1, y + 0.601, 1.36), iso(x + 2.7, y + 0.601, 1.36), iso(x + 2.7, y + 0.601, 1.38), iso(x + 0.1, y + 0.601, 1.38)], 0xc9a45c);
  const label = new Text({ text: hotelName, style: { fontFamily: 'Frank Ruhl Libre, serif', fontSize: 30, fill: 0xe7c983, fontWeight: '700' }, resolution: 2 });
  label.anchor.set(0.5);
  const c = iso(x + 1.4, y + 0.6, 0.9);
  label.position.set(c.x, c.y);
  // Shear the text onto the +y facing plane of the sign.
  label.scale.set(0.5, 0.5);
  label.skew.y = Math.atan2(TH_HALF, TW_HALF);
  const stars = new Text({ text: '★ ★ ★ ★ ★', style: { fontFamily: 'serif', fontSize: 14, fill: 0xc9a45c }, resolution: 2 });
  stars.anchor.set(0.5);
  stars.scale.set(0.5);
  stars.skew.y = label.skew.y;
  const c2 = iso(x + 1.4, y + 0.6, 1.2);
  stars.position.set(c2.x, c2.y);
  view.addChild(label, stars);
  return { view, footprint: { x0: x, y0: y, x1: x + 2.8, y1: y + 0.6 }, lights: [{ x: x + 1.4, y: y + 1.2, z: 0.6, r: 60, color: 0xffd58a }] };
}

const TW_HALF = 32, TH_HALF = 16;

export function createDecor(dec: Decor, hotelName: string): DecorObject | null {
  switch (dec.type) {
    case 'palm': return palm(dec);
    case 'tree': return tree(dec);
    case 'bush': return bush(dec);
    case 'lamp': return lamp(dec);
    case 'bench': return bench(dec);
    case 'fountain': return fountain(dec);
    case 'umbrella': return umbrella(dec);
    case 'lounger': return lounger(dec);
    case 'car': return car(dec);
    case 'flag': return flag(dec);
    case 'hotel_sign': return hotelSign(dec, hotelName);
    default: return null;
  }
}
