import type { Graphics } from 'pixi.js';

// 2:1 dimetric projection. World units are metres. x → screen down-right, y → screen down-left.
export const TW = 64; // screen width of 1 m along x+y
export const TH = 32;
export const ZH = 36; // screen pixels per metre of height
export const FLOOR_HEIGHT = 3.2; // metres per storey
export const WALL_HEIGHT = 3.0;

export interface P { x: number; y: number }

export function iso(x: number, y: number, z = 0): P {
  return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) - z * ZH };
}

/** Inverse projection on the plane z. */
export function unIso(sx: number, sy: number, z = 0): P {
  const a = sx / (TW / 2);
  const b = (sy + z * ZH) / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Painter's-order key: larger = drawn later (in front). */
export function depth(x: number, y: number, z = 0): number {
  return (x + y) * 100 + z * 10;
}

// ---- Colour helpers -------------------------------------------------------

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((color & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

export function mix(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** Deterministic pseudo-random in [0,1) from integer-ish inputs. */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// Lighting: sun from the upper-left. Faces facing +y (screen-left) are lit, +x faces darker.
export const LIGHT = { top: 1.0, left: 0.86, right: 0.7 };

// ---- Drawing primitives ---------------------------------------------------

export function quad(g: Graphics, pts: P[], color: number, alpha = 1): void {
  g.poly(pts.flatMap((p) => [p.x, p.y])).fill({ color, alpha });
}

/** Flat rectangle on plane z. */
export function rectZ(g: Graphics, x: number, y: number, w: number, d: number, z: number, color: number, alpha = 1): void {
  quad(g, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)], color, alpha);
}

export function rectZStroke(g: Graphics, x: number, y: number, w: number, d: number, z: number, color: number, width = 1, alpha = 1): void {
  const p = [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)];
  g.poly(p.flatMap((q) => [q.x, q.y]), true).stroke({ color, width, alpha });
}

export interface BoxColors { top: number; left?: number; right?: number }

/**
 * Axis-aligned box. Draws only the 3 visible faces (top, +y "left", +x "right").
 * `color` may be a single base colour (auto-shaded) or explicit face colours.
 */
export function box(g: Graphics, x: number, y: number, z: number, w: number, d: number, h: number, color: number | BoxColors, alpha = 1): void {
  const c: Required<BoxColors> = typeof color === 'number'
    ? { top: shade(color, LIGHT.top), left: shade(color, LIGHT.left), right: shade(color, LIGHT.right) }
    : { top: color.top, left: color.left ?? shade(color.top, LIGHT.left), right: color.right ?? shade(color.top, LIGHT.right) };
  // +y face (front-left)
  quad(g, [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)], c.left, alpha);
  // +x face (front-right)
  quad(g, [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)], c.right, alpha);
  // top
  rectZ(g, x, y, w, d, z + h, c.top, alpha);
}

/** Soft elliptical contact shadow on the floor. */
export function shadow(g: Graphics, cx: number, cy: number, rx: number, ry: number, z = 0, alpha = 0.18): void {
  const p = iso(cx, cy, z);
  g.ellipse(p.x, p.y, rx * TW * 0.5, ry * TH * 0.5).fill({ color: 0x1a1208, alpha });
}

/** Footprint-shaped soft shadow (slightly offset away from the sun). */
export function boxShadow(g: Graphics, x: number, y: number, w: number, d: number, z = 0, alpha = 0.16, spread = 0.12): void {
  rectZ(g, x - spread * 0.2, y + spread * 0.4, w + spread, d + spread, z + 0.001, 0x20160c, alpha);
}

/** Vertical rectangle on the +y-facing plane (a north wall's inner face) at line y. */
export function faceY(g: Graphics, x: number, y: number, z: number, w: number, h: number, color: number, alpha = 1): void {
  quad(g, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y, z + h), iso(x, y, z + h)], color, alpha);
}

/** Vertical rectangle on the +x-facing plane (a west wall's inner face) at line x. */
export function faceX(g: Graphics, x: number, y: number, z: number, d: number, h: number, color: number, alpha = 1): void {
  quad(g, [iso(x, y, z), iso(x, y + d, z), iso(x, y + d, z + h), iso(x, y, z + h)], color, alpha);
}
