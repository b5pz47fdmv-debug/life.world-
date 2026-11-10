import { AREA_TYPES, GAME_BALANCE } from '../data/catalog';
import { createInitialState } from '../data/initialState';
import { guestRooms } from '../sim/hotel/layout';
import type { Area, GameState, Speed } from '../state/types';
import { EventBus } from './EventBus';
import { advanceClock } from './GameClock';
import { SaveManager, type BackupInfo } from './SaveManager';

export interface GameEvents extends Record<string, unknown> {
  /** Fired every simulation tick. */
  tick: { minutes: number };
  /** A new in-game day started. */
  day: { day: number };
  /** Non-structural state changed (money, prices, speed…) – UI refresh. */
  changed: { reason: string };
  /** The whole state object was replaced (load / restore / new game) – rebuild everything. */
  replaced: { reason: 'restore' | 'new' | 'import' };
  saved: { at: number };
  saveError: { error: unknown };
}

/** Owns the game state, runs the simulation and coordinates saving. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  state: GameState;
  private sinceAutosave = 0;

  constructor(readonly saves: SaveManager, initial?: GameState) {
    this.state = initial ?? createInitialState();
  }

  /** Advances the simulation by real elapsed seconds. */
  update(realSeconds: number): void {
    const dt = Math.min(realSeconds, 0.5); // avoid huge jumps after the tab was suspended
    this.state.meta.playSeconds += dt;
    const step = advanceClock(this.state.clock, dt);
    if (step.minutes > 0) this.bus.emit('tick', { minutes: step.minutes });
    for (const day of step.newDays) this.onNewDay(day);
    this.sinceAutosave += dt;
    if (this.sinceAutosave >= GAME_BALANCE.autosaveSeconds) this.save();
  }

  private onNewDay(day: number): void {
    try {
      this.saves.createBackup(this.state, 'auto', `תחילת יום ${day}`);
    } catch (error) {
      this.bus.emit('saveError', { error });
    }
    this.bus.emit('day', { day });
  }

  // --- Actions ------------------------------------------------------------

  setSpeed(speed: Speed): void {
    this.state.clock.speed = speed;
    this.bus.emit('changed', { reason: 'speed' });
  }

  setRoomTypePrice(type: string, price: number): void {
    const clamped = Math.max(100, Math.min(20000, Math.round(price / 10) * 10));
    this.state.pricing[type] = clamped;
    this.bus.emit('changed', { reason: 'pricing' });
  }

  setView(view: GameState['settings']['view']): void {
    this.state.settings.view = view;
    this.bus.emit('changed', { reason: 'view' });
  }

  // --- Saving -------------------------------------------------------------

  save(): boolean {
    this.sinceAutosave = 0;
    try {
      this.saves.save(this.state);
      this.bus.emit('saved', { at: this.state.meta.savedAt });
      return true;
    } catch (error) {
      this.bus.emit('saveError', { error });
      return false;
    }
  }

  createManualBackup(): BackupInfo {
    this.save();
    return this.saves.createBackup(this.state, 'manual', '');
  }

  restoreBackup(id: string): boolean {
    const s = this.saves.readBackup(id);
    if (!s) return false;
    this.saves.createBackup(this.state, 'auto', 'לפני שחזור');
    this.replace(s, 'restore');
    return true;
  }

  importState(s: GameState): void {
    this.saves.createBackup(this.state, 'auto', 'לפני ייבוא');
    this.replace(s, 'import');
  }

  newGame(): void {
    this.saves.createBackup(this.state, 'auto', 'לפני משחק חדש');
    this.replace(createInitialState(), 'new');
  }

  private replace(s: GameState, reason: GameEvents['replaced']['reason']): void {
    this.state = s;
    this.save();
    this.bus.emit('replaced', { reason });
  }

  // --- Selectors ----------------------------------------------------------

  rooms(): Area[] {
    return guestRooms(this.state.layout);
  }

  roomPrice(room: Area): number {
    return this.state.rooms[room.id]?.price ?? this.state.pricing[room.type] ?? AREA_TYPES[room.type].room?.basePrice ?? 0;
  }

  occupancy(): { occupied: number; total: number; available: number; pct: number } {
    const rooms = this.rooms();
    const occupied = rooms.filter((r) => this.state.rooms[r.id]?.status === 'occupied').length;
    const available = rooms.filter((r) => this.state.rooms[r.id]?.status === 'vacant').length;
    return { occupied, total: rooms.length, available, pct: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0 };
  }
}
