import { Graphics } from 'pixi.js';
import type { Furniture } from '../state/types';
import { box, boxShadow, faceX, iso, quad, rectZ, rectZStroke, shade, shadow } from './iso';

/** Footprint (w along x, d along y) for facing 's'/'n'. Rotated automatically for 'e'/'w'. */
export const FURNITURE_SIZE: Record<string, [number, number]> = {
  rug: [2.5, 1.9], rug_grand: [5.6, 3.6], rug_runner: [1.4, 3.6],
  bed_king: [1.9, 2.15], nightstand: [0.45, 0.42], desk: [1.25, 0.55], wardrobe: [1.05, 0.6],
  armchair: [0.8, 0.8], floor_lamp: [0.32, 0.32], plant_small: [0.36, 0.36], plant_large: [0.6, 0.6],
  shower: [0.9, 0.9], vanity: [0.85, 0.5], toilet: [0.42, 0.62],
  feature_wall: [4.6, 0.1], reception_desk: [3.8, 0.85], bell: [0.1, 0.1],
  sofa: [2.3, 0.92], coffee_table: [1.25, 0.7], flower_table: [1.2, 1.2], column: [0.5, 0.5],
  luggage_cart: [0.6, 1.0], bench: [1.4, 0.5], console: [1.2, 0.4],
};

export function footprint(f: Pick<Furniture, 'type' | 'facing'>): [number, number] {
  const [w, d] = FURNITURE_SIZE[f.type] ?? [1, 1];
  return f.facing === 'e' || f.facing === 'w' ? [d, w] : [w, d];
}

export function isFlat(type: string): boolean {
  return type.startsWith('rug');
}

const WOOD = 0x6b4a2f;
const WOOD_LIGHT = 0x9a6c43;
const GOLD = 0xc9a45c;
const LINEN = 0xf7f4ee;
const VELVET = 0x1f3a4d;
const EMERALD = 0x2f5d50;

type Draw = (g: Graphics, f: Furniture, x: number, y: number, w: number, d: number, z: number) => void;

const DRAW: Record<string, Draw> = {
  rug(g, _f, x, y, w, d, z) {
    rectZ(g, x, y, w, d, z + 0.01, 0x7c2e3a);
    rectZ(g, x + 0.12, y + 0.12, w - 0.24, d - 0.24, z + 0.012, 0xe9dcc0);
    rectZ(g, x + 0.22, y + 0.22, w - 0.44, d - 0.44, z + 0.014, 0x9a3c48);
    rectZStroke(g, x + 0.4, y + 0.4, w - 0.8, d - 0.8, z + 0.016, GOLD, 1, 0.8);
  },
  rug_grand(g, _f, x, y, w, d, z) {
    rectZ(g, x, y, w, d, z + 0.01, 0x1c2f45);
    rectZ(g, x + 0.18, y + 0.18, w - 0.36, d - 0.36, z + 0.012, GOLD);
    rectZ(g, x + 0.24, y + 0.24, w - 0.48, d - 0.48, z + 0.014, 0x25405c);
    for (let i = 0; i < 3; i++) rectZStroke(g, x + 0.6 + i * 0.35, y + 0.6 + i * 0.35, w - 1.2 - i * 0.7, d - 1.2 - i * 0.7, z + 0.016, GOLD, 0.8, 0.55);
    const c = iso(x + w / 2, y + d / 2, z + 0.02);
    g.ellipse(c.x, c.y, 34, 17).stroke({ color: GOLD, width: 1.2, alpha: 0.8 });
  },
  rug_runner(g, _f, x, y, w, d, z) {
    rectZ(g, x, y, w, d, z + 0.01, 0x6e1f2c);
    rectZStroke(g, x + 0.1, y + 0.1, w - 0.2, d - 0.2, z + 0.012, GOLD, 1, 0.9);
  },
  bed_king(g, f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    // Frame & mattress
    box(g, x, y, z, w, d, 0.32, WOOD);
    box(g, x + 0.04, y + 0.04, z + 0.32, w - 0.08, d - 0.08, 0.22, LINEN);
    // Duvet with gold throw at the foot
    box(g, x + 0.02, y + 0.62, z + 0.54, w - 0.04, d - 0.62, 0.06, 0xf1ece2);
    box(g, x + 0.0, y + d - 0.62, z + 0.54, w, 0.5, 0.08, 0xb48a46);
    box(g, x + 0.0, y + d - 0.5, z + 0.62, w, 0.08, 0.01, 0x8f6b31);
    // Pillows
    for (const px of [0.12, 0.98]) box(g, x + px, y + 0.18, z + 0.54, 0.8, 0.38, 0.14, 0xffffff);
    box(g, x + 0.62, y + 0.45, z + 0.56, 0.66, 0.2, 0.16, 0x1f3a4d);
    // Upholstered headboard against the wall
    if (f.facing === 's') {
      box(g, x - 0.1, y - 0.08, z, w + 0.2, 0.12, 1.25, { top: shade(VELVET, 1.3), left: VELVET, right: shade(VELVET, 0.8) });
      for (let i = 0; i < 6; i++) {
        const p = iso(x + 0.15 + i * 0.32, y + 0.04, z + 0.85);
        g.circle(p.x, p.y, 0.9).fill({ color: GOLD });
      }
    }
  },
  nightstand(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x, y, z, w, d, 0.55, WOOD_LIGHT);
    const p = iso(x + w, y + d / 2, z + 0.38);
    g.circle(p.x - 2, p.y - 1, 0.9).fill({ color: GOLD });
    // Lamp
    box(g, x + 0.17, y + 0.15, z + 0.55, 0.1, 0.1, 0.25, GOLD);
    const top = iso(x + 0.22, y + 0.2, z + 0.92);
    g.poly([top.x - 5, top.y - 4, top.x + 5, top.y - 4, top.x + 7, top.y + 6, top.x - 7, top.y + 6]).fill({ color: 0xfff3d6 });
  },
  desk(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x, y, z + 0.7, w, d, 0.05, WOOD);
    box(g, x + 0.02, y + 0.02, z, 0.05, 0.05, 0.7, WOOD);
    box(g, x + w - 0.07, y + 0.02, z, 0.05, 0.05, 0.7, WOOD);
    box(g, x + 0.02, y + d - 0.07, z, 0.05, 0.05, 0.7, WOOD);
    box(g, x + w - 0.07, y + d - 0.07, z, 0.05, 0.05, 0.7, WOOD);
    // Laptop, lamp, chair
    box(g, x + 0.12, y + 0.35, z + 0.75, 0.3, 0.4, 0.02, 0x9aa3ab);
    box(g, x + 0.1, y + 0.1, z + 0.75, 0.08, 0.08, 0.35, GOLD);
    box(g, x + 0.55, y + 0.3, z, 0.45, 0.45, 0.46, 0x2b2b2b);
    box(g, x + 0.55, y + 0.3, z + 0.46, 0.45, 0.45, 0.06, 0x8e2f3c);
    box(g, x + 0.95, y + 0.3, z + 0.46, 0.06, 0.45, 0.45, 0x8e2f3c);
  },
  wardrobe(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x, y, z, w, d, 2.1, { top: shade(WOOD_LIGHT, 1.1), left: WOOD_LIGHT, right: shade(WOOD_LIGHT, 0.82) });
    faceX(g, x + w + 0.001, y + d / 2 - 0.01, z + 0.1, 0.02, 1.9, shade(WOOD, 0.8));
    faceX(g, x + w + 0.002, y + d / 2 - 0.12, z + 1.0, 0.04, 0.25, GOLD);
    faceX(g, x + w + 0.002, y + d / 2 + 0.08, z + 1.0, 0.04, 0.25, GOLD);
  },
  armchair(g, f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    const c = EMERALD;
    box(g, x + 0.05, y + 0.05, z, w - 0.1, d - 0.1, 0.42, c);
    if (f.facing === 'w') box(g, x + w - 0.2, y, z, 0.2, d, 0.85, c);
    else if (f.facing === 'e') box(g, x, y, z, 0.2, d, 0.85, c);
    else box(g, x, y, z, w, 0.2, 0.85, c);
    box(g, x, y, z, w, 0.14, 0.6, shade(c, 1.1));
    box(g, x, y + d - 0.14, z, w, 0.14, 0.6, shade(c, 1.1));
    box(g, x + 0.2, y + 0.18, z + 0.42, w - 0.4, d - 0.36, 0.08, shade(c, 1.25));
  },
  floor_lamp(g, _f, x, y, _w, _d, z) {
    shadow(g, x + 0.16, y + 0.16, 0.3, 0.3, z);
    box(g, x + 0.06, y + 0.06, z, 0.2, 0.2, 0.03, GOLD);
    box(g, x + 0.14, y + 0.14, z, 0.04, 0.04, 1.45, GOLD);
    const t = iso(x + 0.16, y + 0.16, z + 1.6);
    g.poly([t.x - 7, t.y - 6, t.x + 7, t.y - 6, t.x + 10, t.y + 8, t.x - 10, t.y + 8]).fill({ color: 0xf8ecd0 });
  },
  plant_small(g, _f, x, y, w, _d, z) {
    plant(g, x + w / 2, y + w / 2, z, 0.14, 0.5, 0xd8cfc0, 0);
  },
  plant_large(g, f, x, y, w, _d, z) {
    plant(g, x + w / 2, y + w / 2, z, 0.24, 1.35, 0x2b2b2b, f.variant ?? 1);
  },
  shower(g, _f, x, y, w, d, z) {
    rectZ(g, x, y, w, d, z + 0.02, 0xd9e2e6);
    rectZStroke(g, x + 0.1, y + 0.1, w - 0.2, d - 0.2, z + 0.03, 0xaebcc2, 1);
    const drain = iso(x + w / 2, y + d / 2, z + 0.03);
    g.circle(drain.x, drain.y, 1.4).fill({ color: 0x8a979c });
    // Rain head
    box(g, x + w / 2 - 0.1, y + 0.02, z + 2.0, 0.2, 0.25, 0.03, 0xb8c2c7);
    // Glass panels
    quad(g, [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + 2.0), iso(x, y + d, z + 2.0)], 0xbfe3ef, 0.28);
    g.moveTo(iso(x, y + d, z + 2).x, iso(x, y + d, z + 2).y).lineTo(iso(x + w, y + d, z + 2).x, iso(x + w, y + d, z + 2).y).stroke({ color: 0xd9eef5, width: 1 });
  },
  vanity(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x, y, z, w, d, 0.82, WOOD);
    box(g, x - 0.02, y - 0.02, z + 0.82, w + 0.04, d + 0.04, 0.05, 0xf3f0ea);
    const c = iso(x + w / 2, y + d / 2, z + 0.88);
    g.ellipse(c.x, c.y, 9, 4.5).fill({ color: 0xffffff }).stroke({ color: 0xc9c4ba, width: 0.7 });
    // Brass tap and folded towels
    box(g, x + w / 2 - 0.02, y + 0.06, z + 0.87, 0.04, 0.04, 0.16, GOLD);
    box(g, x + 0.06, y + 0.08, z + 0.87, 0.2, 0.3, 0.08, 0xffffff);
  },
  toilet(g, _f, x, y, w, d, z) {
    shadow(g, x + w / 2, y + d / 2, 0.4, 0.5, z);
    box(g, x + w - 0.16, y + 0.06, z, 0.16, d - 0.12, 0.75, 0xffffff);
    box(g, x + 0.04, y + 0.12, z, w - 0.2, d - 0.24, 0.4, 0xf4f4f2);
    const c = iso(x + w / 2 - 0.08, y + d / 2, z + 0.41);
    g.ellipse(c.x, c.y, 6, 3.5).fill({ color: 0xe2e6e8 });
  },
  feature_wall(g, _f, x, y, _w, _d, z) {
    // Walnut slat wall with brass logo plaque behind reception (on a west wall, facing east).
    const len = 4.6;
    faceX(g, x + 0.01, y, z, len, 2.95, 0x4a3324);
    for (let i = 0; i < len; i += 0.16) faceX(g, x + 0.02, y + i, z, 0.07, 2.95, 0x5e4230);
    faceX(g, x + 0.03, y + len / 2 - 0.85, z + 1.55, 1.7, 0.8, 0x1d2b3a);
    faceX(g, x + 0.035, y + len / 2 - 0.8, z + 1.6, 1.6, 0.7, 0x23364a);
    const c = iso(x + 0.04, y + len / 2, z + 1.95);
    g.circle(c.x, c.y, 7).stroke({ color: GOLD, width: 1.6 });
    g.moveTo(c.x - 3, c.y + 3).lineTo(c.x - 3, c.y - 4).moveTo(c.x + 3, c.y + 4).lineTo(c.x + 3, c.y - 3).moveTo(c.x - 3, c.y).lineTo(c.x + 3, c.y + 1).stroke({ color: GOLD, width: 1.4 });
    // Wall lights
    for (const p of [0.35, len - 0.35]) faceX(g, x + 0.04, y + p - 0.06, z + 1.7, 0.12, 0.6, 0xffe2a6);
  },
  reception_desk(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z, 0.22);
    // Marble top over a fluted walnut body with a brass kick band (desk faces east).
    box(g, x, y, z, w, d, 1.05, { top: 0x5b3e2b, left: 0x5b3e2b, right: 0x6b4a33 });
    for (let i = 0.08; i < d; i += 0.12) faceX(g, x + w + 0.002, y + i, z + 0.12, 0.05, 0.86, 0x7a573d);
    faceX(g, x + w + 0.003, y, z + 0.0, d, 0.12, GOLD);
    box(g, x - 0.06, y - 0.06, z + 1.05, w + 0.14, d + 0.12, 0.07, { top: 0xf5f0e6, left: 0xe2dace, right: 0xd8cfbf });
    // Monitors and a flower arrangement
    box(g, x + 0.05, y + 0.6, z + 1.12, 0.05, 0.5, 0.32, 0x23272b);
    box(g, x + 0.05, y + 2.2, z + 1.12, 0.05, 0.5, 0.32, 0x23272b);
    plantFlower(g, x + 0.42, y + d - 0.4, z + 1.12);
  },
  bell(g, _f, x, y, _w, _d, z) {
    const c = iso(x, y, z + 1.14);
    g.ellipse(c.x, c.y, 3, 1.5).fill({ color: GOLD });
    g.ellipse(c.x, c.y - 1.6, 2.4, 2.2).fill({ color: 0xe0bf74 });
  },
  sofa(g, f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    const c = VELVET;
    box(g, x, y, z, w, d, 0.42, c);
    if (f.facing === 's') box(g, x, y, z, w, 0.22, 0.85, c);
    else box(g, x, y + d - 0.22, z, w, 0.22, 0.85, shade(c, 0.95));
    box(g, x, y, z, 0.18, d, 0.62, shade(c, 1.12));
    box(g, x + w - 0.18, y, z, 0.18, d, 0.62, shade(c, 1.12));
    for (let i = 0; i < 3; i++) box(g, x + 0.2 + i * ((w - 0.4) / 3) + 0.02, y + (f.facing === 's' ? 0.24 : 0.06), z + 0.42, (w - 0.4) / 3 - 0.04, d - 0.3, 0.07, shade(c, 1.28));
    // Accent cushions
    const cy = f.facing === 's' ? y + 0.28 : y + d - 0.4;
    box(g, x + 0.25, cy, z + 0.5, 0.36, 0.12, 0.3, GOLD);
    box(g, x + w - 0.61, cy, z + 0.5, 0.36, 0.12, 0.3, 0xe9dcc0);
  },
  coffee_table(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x + 0.1, y + 0.1, z, w - 0.2, d - 0.2, 0.36, 0x2a2a2a);
    box(g, x, y, z + 0.36, w, d, 0.06, { top: 0xf2ece1, left: 0xd8cfbf, right: 0xc9bfae });
    box(g, x + 0.3, y + 0.2, z + 0.42, 0.35, 0.25, 0.05, 0x8e2f3c);
    box(g, x + 0.32, y + 0.22, z + 0.47, 0.3, 0.22, 0.03, 0xe8e2d4);
    const b = iso(x + 0.9, y + 0.35, z + 0.42);
    g.ellipse(b.x, b.y, 5, 2.5).fill({ color: GOLD });
  },
  flower_table(g, _f, x, y, w, d, z) {
    const c = iso(x + w / 2, y + d / 2, z);
    shadow(g, x + w / 2, y + d / 2, w * 0.9, d * 0.9, z, 0.2);
    box(g, x + w / 2 - 0.12, y + d / 2 - 0.12, z, 0.24, 0.24, 0.72, 0x2a2a2a);
    const top = iso(x + w / 2, y + d / 2, z + 0.75);
    g.ellipse(top.x, top.y + 2, w * 32, d * 16).fill({ color: 0xd9cfbe });
    g.ellipse(top.x, top.y, w * 32, d * 16).fill({ color: 0xf6f1e8 }).stroke({ color: GOLD, width: 1 });
    void c;
    plantFlower(g, x + w / 2, y + d / 2, z + 0.78, 1.6);
  },
  column(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z, 0.2);
    box(g, x - 0.05, y - 0.05, z, w + 0.1, d + 0.1, 0.25, 0xd9cfbd);
    box(g, x, y, z + 0.25, w, d, 2.5, { top: 0xf4efe6, left: 0xebe4d7, right: 0xd5ccbc });
    for (const h of [0.4, 2.6]) box(g, x - 0.03, y - 0.03, z + h, w + 0.06, d + 0.06, 0.06, GOLD);
    // Vein
    const a = iso(x + 0.1, y + d, z + 0.6), b = iso(x + 0.4, y + d, z + 2.2);
    g.moveTo(a.x, a.y).bezierCurveTo(a.x + 4, a.y - 20, b.x - 4, b.y + 20, b.x, b.y).stroke({ color: 0xc8bfae, width: 0.8 });
  },
  luggage_cart(g, _f, x, y, w, d, z) {
    shadow(g, x + w / 2, y + d / 2, w, d, z);
    box(g, x, y, z + 0.18, w, d, 0.04, 0x8e2f3c);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x + px - 0.03, y + py - 0.03, z, 0.06, 0.06, 0.18, 0x333333);
    // Brass arch
    const a = iso(x + w / 2, y, z + 0.22), b = iso(x + w / 2, y + d, z + 0.22);
    g.moveTo(a.x, a.y).lineTo(a.x, a.y - 58).quadraticCurveTo((a.x + b.x) / 2, a.y - 78, b.x, b.y - 58).lineTo(b.x, b.y).stroke({ color: GOLD, width: 2.2 });
    box(g, x + 0.08, y + 0.1, z + 0.22, 0.42, 0.5, 0.6, 0x3e2c22);
    box(g, x + 0.12, y + 0.62, z + 0.22, 0.36, 0.3, 0.42, 0x1f3a4d);
  },
  bench(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x + 0.05, y + 0.05, z, 0.08, d - 0.1, 0.42, 0x2a2a2a);
    box(g, x + w - 0.13, y + 0.05, z, 0.08, d - 0.1, 0.42, 0x2a2a2a);
    box(g, x, y, z + 0.42, w, d, 0.08, 0xe9dcc0);
  },
  console(g, _f, x, y, w, d, z) {
    boxShadow(g, x, y, w, d, z);
    box(g, x, y, z + 0.78, w, d, 0.05, 0xf2ece1);
    box(g, x + 0.05, y + 0.05, z, 0.05, d - 0.1, 0.78, GOLD);
    box(g, x + w - 0.1, y + 0.05, z, 0.05, d - 0.1, 0.78, GOLD);
    plantFlower(g, x + w * 0.3, y + d / 2, z + 0.83, 0.8);
    box(g, x + w * 0.65, y + 0.1, z + 0.83, 0.2, 0.2, 0.3, 0x2f5d50);
  },
};

const LEAF = [0x2f6b3c, 0x3d7f47, 0x4b8f50, 0x2a5e35];

function plant(g: Graphics, cx: number, cy: number, z: number, r: number, h: number, pot: number, variant: number): void {
  shadow(g, cx, cy, r * 3, r * 3, z);
  box(g, cx - r, cy - r, z, r * 2, r * 2, r * 1.6, { top: shade(pot, 0.5), left: pot, right: shade(pot, 0.8) });
  const base = iso(cx, cy, z + r * 1.6);
  const n = 9 + variant * 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + variant;
    const len = (h * 0.55 + ((i * 37) % 10) / 30) * 36;
    const tx = base.x + Math.cos(a) * len * 0.55;
    const ty = base.y - len * (0.75 + Math.sin(a * 3) * 0.15);
    g.moveTo(base.x, base.y).quadraticCurveTo((base.x + tx) / 2 + Math.cos(a) * 4, ty + len * 0.2, tx, ty)
      .quadraticCurveTo((base.x + tx) / 2 - Math.cos(a) * 2, (base.y + ty) / 2, base.x, base.y)
      .fill({ color: LEAF[i % LEAF.length] });
  }
}

function plantFlower(g: Graphics, cx: number, cy: number, z: number, s = 1): void {
  const p = iso(cx, cy, z);
  g.roundRect(p.x - 3 * s, p.y - 7 * s, 6 * s, 8 * s, 2).fill({ color: 0xe8edf0, alpha: 0.85 });
  const cols = [0xffffff, 0xf3d3dc, 0xe8b4c0, 0xfff4d6];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39;
    const r = (3 + (i % 3) * 2) * s;
    g.circle(p.x + Math.cos(a) * r, p.y - 11 * s - Math.sin(a) * r * 0.6, 2.4 * s).fill({ color: cols[i % cols.length] });
  }
  for (let i = 0; i < 4; i++) g.circle(p.x + (i - 1.5) * 4 * s, p.y - 8 * s, 1.8 * s).fill({ color: 0x4b8f50 });
}

export function drawFurniture(f: Furniture, z: number): Graphics {
  const g = new Graphics();
  const [w, d] = footprint(f);
  (DRAW[f.type] ?? fallback)(g, f, f.x, f.y, w, d, z);
  return g;
}

const fallback: Draw = (g, _f, x, y, w, d, z) => box(g, x, y, z, w, d, 0.5, 0xb08968);
