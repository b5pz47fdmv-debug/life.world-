import { GAME_BALANCE } from '../data/catalog';
import type { GameState } from '../state/types';
import { migrate } from './migrations';

/** Storage abstraction so the save system is testable without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BackupInfo {
  id: string;
  kind: 'manual' | 'auto';
  createdAt: number;
  label: string;
  day: number;
  money: number;
  hotelName: string;
}

const KEY_CURRENT = 'hoteltycoon.save.current';
const KEY_PREVIOUS = 'hoteltycoon.save.previous';
const KEY_INDEX = 'hoteltycoon.backups.index';
const KEY_BACKUP = (id: string) => `hoteltycoon.backup.${id}`;
export const EXPORT_MAGIC = 'HOTEL_TYCOON_SAVE';

export interface LoadResult {
  state: GameState | null;
  recovered: boolean;
}

export class SaveManager {
  constructor(private store: KeyValueStore, private now: () => number = Date.now) {}

  /** Saves the current game. Keeps the previous save as a safety copy. */
  save(state: GameState): void {
    state.meta.savedAt = this.now();
    const json = JSON.stringify(state);
    const prev = this.store.getItem(KEY_CURRENT);
    if (prev) this.store.setItem(KEY_PREVIOUS, prev);
    this.store.setItem(KEY_CURRENT, json);
  }

  /** Loads the current save, falling back to the previous save and then to the newest backup. */
  load(): LoadResult {
    const current = this.tryParse(this.store.getItem(KEY_CURRENT));
    if (current) return { state: current, recovered: false };
    const hadCurrent = this.store.getItem(KEY_CURRENT) !== null;
    const prev = this.tryParse(this.store.getItem(KEY_PREVIOUS));
    if (prev) return { state: prev, recovered: hadCurrent };
    for (const b of this.listBackups()) {
      const s = this.tryParse(this.store.getItem(KEY_BACKUP(b.id)));
      if (s) return { state: s, recovered: hadCurrent };
    }
    return { state: null, recovered: false };
  }

  listBackups(): BackupInfo[] {
    try {
      const list = JSON.parse(this.store.getItem(KEY_INDEX) ?? '[]') as BackupInfo[];
      return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
    } catch {
      return [];
    }
  }

  createBackup(state: GameState, kind: BackupInfo['kind'], label = ''): BackupInfo {
    const createdAt = this.now();
    const info: BackupInfo = {
      id: `${createdAt.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      kind, createdAt, label,
      day: state.clock.day,
      money: state.finance.money,
      hotelName: state.meta.hotelName,
    };
    this.store.setItem(KEY_BACKUP(info.id), JSON.stringify(state));
    const list = [info, ...this.listBackups()];
    // Rotate: keep the newest N of each kind.
    const keep: BackupInfo[] = [];
    const counts = { manual: 0, auto: 0 };
    const max = { manual: GAME_BALANCE.maxManualBackups, auto: GAME_BALANCE.maxAutoBackups };
    for (const b of list) {
      if (++counts[b.kind] <= max[b.kind]) keep.push(b);
      else this.store.removeItem(KEY_BACKUP(b.id));
    }
    this.store.setItem(KEY_INDEX, JSON.stringify(keep));
    return info;
  }

  readBackup(id: string): GameState | null {
    return this.tryParse(this.store.getItem(KEY_BACKUP(id)));
  }

  deleteBackup(id: string): void {
    this.store.removeItem(KEY_BACKUP(id));
    this.store.setItem(KEY_INDEX, JSON.stringify(this.listBackups().filter((b) => b.id !== id)));
  }

  clearCurrent(): void {
    this.store.removeItem(KEY_CURRENT);
    this.store.removeItem(KEY_PREVIOUS);
  }

  /** Serialises a game for a downloadable backup file. */
  exportString(state: GameState): string {
    return JSON.stringify({ magic: EXPORT_MAGIC, exportedAt: this.now(), state }, null, 1);
  }

  /** Parses an exported file. Throws on invalid content. */
  importString(text: string): GameState {
    const obj = JSON.parse(text);
    if (!obj || obj.magic !== EXPORT_MAGIC) throw new Error('not a hotel tycoon save');
    return migrate(obj.state);
  }

  private tryParse(json: string | null): GameState | null {
    if (!json) return null;
    try {
      return migrate(JSON.parse(json));
    } catch {
      return null;
    }
  }
}

/** In-memory store (tests / when localStorage is unavailable, e.g. private mode). */
export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

export function browserStore(): KeyValueStore {
  try {
    const k = '__ht_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return new MemoryStore();
  }
}
