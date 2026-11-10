import { Container, Graphics } from 'pixi.js';
import { iso, shade } from './iso';

export interface Appearance {
  skin: number;
  hair: number;
  top: number;
  bottom: number;
  shoes: number;
  hairStyle: 'short' | 'bun' | 'long';
  accent?: number;
}

export const SKIN_TONES = [0xf3d2b8, 0xe8b996, 0xc98f68, 0x9c6644, 0x6e4630];
export const HAIR_COLS = [0x2b1d14, 0x4a3020, 0x7a5230, 0xc9a46a, 0x1a1a1a, 0x8a8a8a];

/**
 * A person ~1.72 m tall drawn in a 3/4 view. Origin = feet on the floor.
 * Built from separate parts so phase 2 can animate walking (legs/arms swing).
 */
export class CharacterView extends Container {
  private body = new Graphics();
  private head = new Graphics();
  private legL = new Graphics();
  private legR = new Graphics();
  private armL = new Graphics();
  private armR = new Graphics();
  private phase = Math.random() * 10;

  constructor(readonly look: Appearance, facingLeft = false) {
    super();
    const sh = new Graphics();
    sh.ellipse(0, 0, 9, 4.5).fill({ color: 0x1a1208, alpha: 0.22 });
    this.addChild(sh, this.legL, this.legR, this.armL, this.body, this.armR, this.head);
    this.draw();
    if (facingLeft) this.scale.x = -1;
  }

  private draw(): void {
    const L = this.look;
    // Legs (pivot at hip)
    for (const [g, dx] of [[this.legL, -3], [this.legR, 3]] as const) {
      g.roundRect(-2.2, 0, 4.4, 28, 2).fill({ color: L.bottom });
      g.roundRect(-2.6, 26, 5.6, 3.4, 1.5).fill({ color: L.shoes });
      g.position.set(dx, -30);
    }
    // Torso
    const b = this.body;
    b.roundRect(-7.5, -56, 15, 28, 5).fill({ color: L.top });
    b.rect(-7.5, -33, 15, 4).fill({ color: shade(L.top, 0.8) });
    b.poly([-3, -56, 0, -50, 3, -56]).fill({ color: 0xffffff });
    if (L.accent !== undefined) {
      b.rect(-7.5, -46, 15, 1.2).fill({ color: L.accent });
      b.circle(4, -49, 1.3).fill({ color: L.accent });
    }
    b.rect(-2, -60, 4, 5).fill({ color: L.skin });
    // Arms (pivot at shoulder)
    for (const [g, dx] of [[this.armL, -8], [this.armR, 8]] as const) {
      g.roundRect(-2, 0, 4, 22, 2).fill({ color: shade(L.top, 0.92) });
      g.circle(0, 23, 2.2).fill({ color: L.skin });
      g.position.set(dx, -54);
    }
    // Head
    const h = this.head;
    h.position.set(0, -60);
    h.ellipse(0, -7, 6.3, 7.4).fill({ color: L.skin });
    h.circle(2.5, -7.5, 0.9).fill({ color: 0x2a1a10 });
    h.circle(-1.5, -7.5, 0.9).fill({ color: 0x2a1a10 });
    h.moveTo(-0.5, -3.6).quadraticCurveTo(1, -2.6, 2.5, -3.6).stroke({ color: shade(L.skin, 0.7), width: 0.8 });
    switch (L.hairStyle) {
      case 'short':
        h.ellipse(0, -11.5, 6.6, 4.2).fill({ color: L.hair });
        h.rect(-6.6, -11.5, 2.4, 4.5).fill({ color: L.hair });
        break;
      case 'bun':
        h.ellipse(0, -11.5, 6.8, 4.6).fill({ color: L.hair });
        h.circle(-4.5, -14.5, 3.4).fill({ color: L.hair });
        h.rect(-6.8, -11.5, 2.2, 6).fill({ color: L.hair });
        break;
      case 'long':
        h.ellipse(0, -11.5, 7, 4.8).fill({ color: L.hair });
        h.roundRect(-7.2, -12, 4, 15, 2).fill({ color: L.hair });
        h.roundRect(3.6, -12, 3.4, 11, 2).fill({ color: L.hair });
        break;
    }
  }

  /** Idle animation: breathing and small glances. */
  idle(t: number): void {
    const p = t + this.phase;
    this.body.scale.y = 1 + Math.sin(p * 2.2) * 0.012;
    this.head.position.y = -60 + Math.sin(p * 2.2) * 0.35;
    const glance = Math.sin(p * 0.37) > 0.82 ? 1.2 : Math.sin(p * 0.37) < -0.85 ? -1.2 : 0;
    this.head.position.x += (glance - this.head.position.x) * 0.08;
    this.armL.rotation = Math.sin(p * 2.2) * 0.02;
    this.armR.rotation = -Math.sin(p * 2.2) * 0.02;
  }

  /** Walking cycle (used from phase 2). */
  walk(t: number, speed = 1): void {
    const s = Math.sin(t * 9 * speed);
    this.legL.rotation = s * 0.45;
    this.legR.rotation = -s * 0.45;
    this.armL.rotation = -s * 0.4;
    this.armR.rotation = s * 0.4;
    this.body.position.y = -Math.abs(Math.cos(t * 9 * speed)) * 1.2;
    this.head.position.y = -60 + this.body.position.y;
  }

  placeAt(x: number, y: number, z: number): void {
    const p = iso(x, y, z);
    this.position.set(p.x, p.y);
  }
}

export const RECEPTIONIST: Appearance = { skin: SKIN_TONES[1], hair: HAIR_COLS[0], top: 0x1d2b4a, bottom: 0x1a1f2b, shoes: 0x111111, hairStyle: 'bun', accent: 0xc9a45c };
