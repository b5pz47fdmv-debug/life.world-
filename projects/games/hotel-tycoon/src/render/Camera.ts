import type { Container } from 'pixi.js';

export interface CameraBounds { minX: number; minY: number; maxX: number; maxY: number }

/**
 * Touch-first camera: one-finger drag with inertia, two-finger pinch zoom,
 * mouse wheel zoom, and tap detection. Works on the target container's transform.
 */
export class Camera {
  zoom = 1;
  minZoom = 0.3;
  maxZoom = 2.6;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
  private pinchDist = 0;
  private moved = false;
  private lastMove = 0;
  private target?: { x: number; y: number; zoom: number };
  bounds: CameraBounds = { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 };
  onTap?: (sx: number, sy: number) => void;

  constructor(private el: HTMLElement, private world: Container, private viewport: () => { w: number; h: number }) {
    el.addEventListener('pointerdown', this.down, { passive: false });
    window.addEventListener('pointermove', this.move, { passive: false });
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    el.addEventListener('wheel', this.wheel, { passive: false });
    // iOS Safari: block native pinch / double-tap zoom on the canvas.
    el.addEventListener('gesturestart', (e) => e.preventDefault());
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  /** Centre the view on a world-space point (container-local pixels). */
  centerOn(px: number, py: number, zoom = this.zoom, animate = false): void {
    const { w, h } = this.viewport();
    const tx = w / 2 - px * zoom;
    const ty = h / 2 - py * zoom;
    if (animate) this.target = { x: tx, y: ty, zoom };
    else {
      this.zoom = zoom;
      this.x = tx;
      this.y = ty;
      this.apply();
    }
  }

  update(dt: number): void {
    if (this.target) {
      const k = 1 - Math.pow(0.0015, dt);
      this.x += (this.target.x - this.x) * k;
      this.y += (this.target.y - this.y) * k;
      this.zoom += (this.target.zoom - this.zoom) * k;
      if (Math.abs(this.target.x - this.x) < 0.5 && Math.abs(this.target.zoom - this.zoom) < 0.001) this.target = undefined;
    } else if (this.pointers.size === 0 && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1)) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const decay = Math.pow(0.004, dt);
      this.vx *= decay;
      this.vy *= decay;
    }
    this.clamp();
    this.apply();
  }

  /** Converts a screen point to container-local coordinates. */
  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom };
  }

  private apply(): void {
    this.world.position.set(this.x, this.y);
    this.world.scale.set(this.zoom);
  }

  private clamp(): void {
    const { w, h } = this.viewport();
    const b = this.bounds;
    const z = this.zoom;
    // Keep at least part of the scene in view.
    const minX = w * 0.5 - b.maxX * z, maxX = w * 0.5 - b.minX * z;
    const minY = h * 0.5 - b.maxY * z, maxY = h * 0.5 - b.minY * z;
    this.x = Math.min(maxX, Math.max(minX, this.x));
    this.y = Math.min(maxY, Math.max(minY, this.y));
  }

  private zoomAt(sx: number, sy: number, factor: number): void {
    const nz = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const f = nz / this.zoom;
    this.x = sx - (sx - this.x) * f;
    this.y = sy - (sy - this.y) * f;
    this.zoom = nz;
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent): void => {
    e.preventDefault();
    this.target = undefined;
    const p = this.local(e);
    this.pointers.set(e.pointerId, { ...p, sx: p.x, sy: p.y, t: performance.now() });
    if (this.pointers.size === 1) {
      this.moved = false;
      this.vx = this.vy = 0;
    }
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.moved = true;
    }
  };

  private move = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    e.preventDefault();
    const p = this.local(e);
    const now = performance.now();
    if (this.pointers.size === 1) {
      const dx = p.x - prev.x, dy = p.y - prev.y;
      this.x += dx;
      this.y += dy;
      const dtm = Math.max(1, now - this.lastMove) / 1000;
      this.vx = this.vx * 0.6 + (dx / dtm) * 0.4;
      this.vy = this.vy * 0.6 + (dy / dtm) * 0.4;
      this.lastMove = now;
      if (Math.hypot(p.x - prev.sx, p.y - prev.sy) > 9) this.moved = true;
    }
    prev.x = p.x;
    prev.y = p.y;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / this.pinchDist);
      this.pinchDist = dist;
    }
    this.clamp();
    this.apply();
  };

  private up = (e: PointerEvent): void => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0 && !this.moved && performance.now() - p.t < 450) this.onTap?.(p.x, p.y);
    if (this.pointers.size === 0 && performance.now() - this.lastMove > 80) this.vx = this.vy = 0;
    if (this.pointers.size === 1) {
      const rest = [...this.pointers.values()][0];
      rest.sx = rest.x;
      rest.sy = rest.y;
    }
    this.pinchDist = 0;
  };

  private wheel = (e: WheelEvent): void => {
    e.preventDefault();
    const r = this.el.getBoundingClientRect();
    this.target = undefined;
    this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    this.clamp();
    this.apply();
  };

  zoomBy(factor: number): void {
    const { w, h } = this.viewport();
    this.zoomAt(w / 2, h / 2, factor);
    this.clamp();
    this.apply();
  }
}
