import { Application, ColorMatrixFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Game } from '../core/Game';
import { goldenFactor, nightFactor } from '../core/GameClock';
import { AREA_TYPES } from '../data/catalog';
import { buildCellMap, computeWalls } from '../sim/hotel/layout';
import type { Area, Building } from '../state/types';
import { drawAreaFloor, drawPlinth, drawStoreyExterior, drawWallSegment, PLINTH, WALL_T } from './architecture';
import { CharacterView, RECEPTIONIST } from './characters';
import { drawFurniture, footprint, isFlat } from './furniture';
import { box, FLOOR_HEIGHT, iso, rectZ, unIso } from './iso';
import { isoSort, type Footprint } from './isoSort';
import { createDecor, drawGround, drawSurface, type Animator } from './outdoor';
import { Camera } from './Camera';

interface Light { sprite: Sprite; base: number; flicker: number }

export type Pick =
  | { kind: 'area'; area: Area }
  | { kind: 'building'; building: Building }
  | null;

export class WorldRenderer {
  readonly root = new Container();
  private scene = new Container();
  private lightsLayer = new Container();
  private waterG = new Graphics();
  private selection = new Graphics();
  private selectedArea: Area | null = null;
  private animators: Animator[] = [];
  private characters: CharacterView[] = [];
  private lights: Light[] = [];
  private filter = new ColorMatrixFilter();
  private glow: Texture;
  private time = 0;
  readonly camera: Camera;

  constructor(private app: Application, private game: Game) {
    this.app.stage.addChild(this.root);
    this.root.addChild(this.scene, this.lightsLayer);
    this.filter.antialias = 'inherit';
    this.lightsLayer.blendMode = 'add';
    this.glow = makeGlowTexture();
    this.camera = new Camera(app.canvas as HTMLCanvasElement, this.root, () => ({ w: app.screen.width, h: app.screen.height }));
  }

  /** Rebuilds the whole scene from game state. Called on load and structural changes. */
  build(): void {
    for (const c of this.scene.removeChildren()) c.destroy({ children: true });
    for (const c of this.lightsLayer.removeChildren()) c.destroy();
    this.animators = [];
    this.characters = [];
    this.lights = [];
    const s = this.game.state;
    const L = s.layout;

    this.scene.addChild(drawGround(L));
    const flat = new Graphics();
    for (const surf of L.surfaces) if (surf.kind !== 'water') drawSurface(flat, surf);
    this.scene.addChild(flat);
    this.waterG = new Graphics();
    this.scene.addChild(this.waterG);

    // Split outdoor decor into "behind" and "in front of" the buildings.
    const behind: { view: Container; fp: Footprint }[] = [];
    const front: { view: Container; fp: Footprint }[] = [];
    for (const d of L.decor) {
      const obj = createDecor(d, s.meta.hotelName);
      if (!obj) continue;
      if (obj.animate) this.animators.push(obj.animate);
      for (const l of obj.lights) this.addLight(l.x, l.y, l.z, l.r, l.color);
      const isFront = L.buildings.every((b) => d.x >= b.x + b.w || d.y >= b.y + b.d);
      (isFront ? front : behind).push({ view: obj.view, fp: obj.footprint });
    }
    this.scene.addChild(sorted(behind));
    for (const b of L.buildings) this.scene.addChild(this.buildBuilding(b));
    this.scene.addChild(sorted(front));

    this.computeBounds();
    this.updateLights(nightFactor(s.clock.minute));
  }

  private buildBuilding(b: Building): Container {
    const s = this.game.state;
    const c = new Container();
    const g = new Graphics();
    c.addChild(g);
    drawPlinth(g, b);
    const exterior = s.settings.view === 'exterior';
    const viewFloor = Math.min(s.settings.viewFloor, b.floors - 1);
    const lastSolid = exterior ? b.floors - 1 : viewFloor - 1;
    for (let f = 0; f <= lastSolid; f++) {
      const z = PLINTH + f * FLOOR_HEIGHT;
      drawStoreyExterior(g, b, f, z, f === b.floors - 1 && exterior, f === 0, s.layout);
      if (exterior) this.addWindowLights(b, f, z);
    }
    if (exterior) {
      this.addCanopy(c, b);
      return c;
    }
    c.addChild(this.buildFloorInterior(b, viewFloor));
    return c;
  }

  private buildFloorInterior(b: Building, floor: number): Container {
    const s = this.game.state;
    const L = s.layout;
    const z = PLINTH + floor * FLOOR_HEIGHT;
    const root = new Container();
    const flat = new Graphics();
    const backLayer = new Container();
    const frontLayer = new Container();
    const items: { view: Container; fp: Footprint }[] = [];

    const areas = L.areas.filter((a) => a.buildingId === b.id && a.floor === floor).sort((a, c) => (a.parentId ? 1 : 0) - (c.parentId ? 1 : 0));
    if (floor > 0) rectZ(flat, b.x, b.y, b.w, b.d, z - 0.02, 0xcfc5b4);
    for (const a of areas) drawAreaFloor(flat, a, z);
    for (const f of L.furniture) {
      const area = areas.find((a) => a.id === f.areaId);
      if (!area || !isFlat(f.type)) continue;
      flat.addChild(drawFurniture(f, z));
    }

    for (const seg of computeWalls(L, b.id, floor)) {
      const view = drawWallSegment(L, seg, z, b.facade);
      const fp: Footprint = seg.axis === 'x'
        ? { x0: seg.x, y0: seg.y - WALL_T / 2, x1: seg.x + 1, y1: seg.y + WALL_T / 2 }
        : { x0: seg.x - WALL_T / 2, y0: seg.y, x1: seg.x + WALL_T / 2, y1: seg.y + 1 };
      if (seg.kind === 'back') backLayer.addChild(view);
      else if (seg.kind === 'front') frontLayer.addChild(view);
      else items.push({ view, fp });
    }
    // Back walls: north walls then west walls, ordered by depth.
    backLayer.children.sort((a, c) => a.getLocalBounds().minY - c.getLocalBounds().minY);

    for (const f of L.furniture) {
      const area = areas.find((a) => a.id === f.areaId);
      if (!area || isFlat(f.type)) continue;
      const [w, d] = footprint(f);
      items.push({ view: drawFurniture(f, z), fp: { x0: f.x, y0: f.y, x1: f.x + w, y1: f.y + d } });
    }

    // Phase 1: one receptionist on duty behind the desk.
    const desk = L.furniture.find((f) => f.type === 'reception_desk' && areas.some((a) => a.id === f.areaId));
    if (desk) {
      const [, d] = footprint(desk);
      const ch = new CharacterView(RECEPTIONIST, false);
      const cx = desk.x - 0.55, cy = desk.y + d * 0.45;
      ch.placeAt(cx, cy, z);
      this.characters.push(ch);
      items.push({ view: ch, fp: { x0: cx - 0.2, y0: cy - 0.2, x1: cx + 0.2, y1: cy + 0.2 } });
    }

    // Interior lighting pools at night.
    for (const a of areas) {
      if (a.parentId) continue;
      const def = AREA_TYPES[a.type];
      const n = Math.max(1, Math.round((a.w * a.d) / 22));
      for (let i = 0; i < n; i++) this.addLight(a.x + (a.w * (i + 0.5)) / n, a.y + a.d / 2, z + 2.2, def.category === 'public' ? 120 : 80, 0xffcf8a);
    }

    this.selection = new Graphics();
    flat.addChild(this.selection);
    root.addChild(flat, backLayer, sorted(items), frontLayer);
    this.drawSelection();
    return root;
  }

  private addCanopy(c: Container, b: Building): void {
    const lobby = this.game.state.layout.areas.find((a) => a.buildingId === b.id && a.floor === 0 && a.doors.some((d) => d.kind === 'entrance'));
    const door = lobby?.doors.find((d) => d.kind === 'entrance');
    if (!door) return;
    const g = new Graphics();
    const x0 = door.x - 1, x1 = door.x + (door.width ?? 1) + 1, y0 = b.y + b.d, y1 = y0 + 2.6, top = PLINTH + 2.9;
    for (const px of [x0 + 0.15, x1 - 0.35]) {
      boxCol(g, px, y1 - 0.4, top);
    }
    boxSlab(g, x0, y0, x1 - x0, y1 - y0, top);
    c.addChild(g);
    this.addLight((x0 + x1) / 2, y0 + 1.3, top - 0.2, 90, 0xffd58a);
  }

  private addWindowLights(b: Building, floor: number, z: number): void {
    for (let i = 0; i < b.w; i += 2) {
      if ((i + floor * 3) % 5 === 4) continue;
      this.addLight(b.x + i + 1, b.y + b.d + 0.1, z + 1.6, 34, 0xffd9a0, 0.7);
    }
    for (let j = 0; j < b.d; j += 2) {
      if ((j + floor) % 4 === 3) continue;
      this.addLight(b.x + b.w + 0.1, b.y + j + 1, z + 1.6, 34, 0xffd9a0, 0.7);
    }
  }

  private addLight(x: number, y: number, z: number, r: number, color: number, base = 1): void {
    const s = new Sprite(this.glow);
    const p = iso(x, y, z);
    s.anchor.set(0.5);
    s.position.set(p.x, p.y);
    s.width = r * 2;
    s.height = r * 1.3;
    s.tint = color;
    s.alpha = 0;
    this.lightsLayer.addChild(s);
    this.lights.push({ sprite: s, base, flicker: Math.random() * 10 });
  }

  // --- Per-frame -----------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    const s = this.game.state;
    const night = nightFactor(s.clock.minute);
    const golden = goldenFactor(s.clock.minute);
    for (const a of this.animators) a(this.time, night);
    for (const c of this.characters) c.idle(this.time);
    this.waterG.clear();
    for (const surf of s.layout.surfaces) if (surf.kind === 'water') drawSurface(this.waterG, surf, this.time);
    this.applyDayNight(night, golden);
    this.updateLights(night);
    if (this.selectedArea) this.selection.alpha = 0.65 + Math.sin(this.time * 4) * 0.35;
    this.camera.update(dt);
  }

  private applyDayNight(night: number, golden: number): void {
    // Plain daylight needs no filter: skipping it keeps native MSAA and saves GPU work.
    const needed = night > 0.001 || golden > 0.001;
    if (!needed) {
      if (this.scene.filters) this.scene.filters = null;
      return;
    }
    if (!this.scene.filters) this.scene.filters = [this.filter];
    const m = this.filter.matrix;
    // Base brightness drops at night with a blue cast; golden hour adds warmth.
    const br = 1 - night * 0.52;
    const r = br * (1 + golden * 0.1) - night * 0.06;
    const g = br * (1 + golden * 0.02);
    const b = br * (1 - golden * 0.12) + night * 0.1;
    m.fill(0);
    m[0] = r; m[6] = g; m[12] = b; m[18] = 1;
    m[4] = night * 0.02; m[9] = night * 0.025; m[14] = night * 0.07;
    this.filter.matrix = m;
  }

  private updateLights(night: number): void {
    for (const l of this.lights) l.sprite.alpha = night * l.base * (0.85 + Math.sin(this.time * 3 + l.flicker) * 0.05);
  }

  // --- Picking & selection -------------------------------------------------

  pick(sx: number, sy: number): Pick {
    const s = this.game.state;
    const p = this.camera.toWorld(sx, sy);
    for (const b of s.layout.buildings) {
      if (s.settings.view === 'exterior') {
        for (let f = b.floors - 1; f >= 0; f--) {
          const w = unIso(p.x, p.y, PLINTH + f * FLOOR_HEIGHT + 1.5);
          if (w.x >= b.x && w.x < b.x + b.w && w.y >= b.y && w.y < b.y + b.d) return { kind: 'building', building: b };
        }
        continue;
      }
      const floor = Math.min(s.settings.viewFloor, b.floors - 1);
      const w = unIso(p.x, p.y, PLINTH + floor * FLOOR_HEIGHT);
      const id = buildCellMap(s.layout, b.id, floor).get(Math.floor(w.x), Math.floor(w.y));
      if (!id) continue;
      let area = s.layout.areas.find((a) => a.id === id)!;
      if (area.parentId) area = s.layout.areas.find((a) => a.id === area.parentId) ?? area;
      return { kind: 'area', area };
    }
    return null;
  }

  select(area: Area | null): void {
    this.selectedArea = area;
    this.drawSelection();
  }

  private drawSelection(): void {
    const g = this.selection;
    if (g.destroyed) return;
    g.clear();
    const a = this.selectedArea;
    if (!a) return;
    const z = PLINTH + a.floor * FLOOR_HEIGHT + 0.03;
    rectZ(g, a.x, a.y, a.w, a.d, z, 0xc9a45c, 0.16);
    const pts = [iso(a.x, a.y, z), iso(a.x + a.w, a.y, z), iso(a.x + a.w, a.y + a.d, z), iso(a.x, a.y + a.d, z)];
    g.poly(pts.flatMap((q) => [q.x, q.y]), true).stroke({ color: 0xe7c983, width: 3 });
  }

  focusArea(a: Area): void {
    const c = iso(a.x + a.w / 2, a.y + a.d / 2, PLINTH + a.floor * FLOOR_HEIGHT + 1);
    const zoom = Math.max(this.camera.zoom, 1.25);
    // Shift the room into the upper part of the screen so the info card doesn't cover it.
    const offset = this.app.screen.height * 0.16;
    this.camera.centerOn(c.x, c.y + offset / zoom, zoom, true);
  }

  recenter(animate = true): void {
    const b = this.game.state.layout.buildings[0];
    const c = iso(b.x + b.w / 2, b.y + b.d / 2 + 2, 1.5);
    const vw = this.app.screen.width;
    const fit = Math.min(1.1, Math.max(0.42, vw / ((b.w + b.d + 6) * 32)));
    this.camera.centerOn(c.x, c.y, fit, animate);
  }

  private computeBounds(): void {
    const { w, d } = this.game.state.layout.lot;
    const pts = [iso(0, 0, 8), iso(w, 0, 0), iso(0, d, 0), iso(w, d, -1.4)];
    this.camera.bounds = {
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      minY: Math.min(...pts.map((p) => p.y)),
      maxY: Math.max(...pts.map((p) => p.y)),
    };
  }

  get night(): number {
    return nightFactor(this.game.state.clock.minute);
  }
}

function sorted(items: { view: Container; fp: Footprint }[]): Container {
  const c = new Container();
  const order = isoSort(items.map((i) => {
    const b = i.view.getLocalBounds();
    return { fp: i.fp, screen: { minX: b.minX + i.view.x, minY: b.minY + i.view.y, maxX: b.maxX + i.view.x, maxY: b.maxY + i.view.y } };
  }));
  for (const idx of order) c.addChild(items[idx].view);
  return c;
}

function makeGlowTexture(): Texture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(cv);
}

// Entrance canopy pieces
function boxCol(g: Graphics, x: number, y: number, h: number): void {
  box(g, x, y, PLINTH, 0.2, 0.2, h - PLINTH, 0xe9e1d2);
  box(g, x - 0.04, y - 0.04, PLINTH, 0.28, 0.28, 0.12, 0xc9a45c);
}
function boxSlab(g: Graphics, x: number, y: number, w: number, d: number, z: number): void {
  box(g, x, y, z, w, d, 0.28, { top: 0x2b3640, left: 0xe9e1d2, right: 0xd6cdbd });
  box(g, x, y + d - 0.02, z + 0.06, w, 0.02, 0.06, 0xc9a45c);
}
