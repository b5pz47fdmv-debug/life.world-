import { describe, expect, it } from 'vitest';
import { MemoryStore, SaveManager } from '../src/core/SaveManager';
import { Game } from '../src/core/Game';
import { createInitialState } from '../src/data/initialState';
import { SAVE_VERSION } from '../src/state/types';
import { migrate } from '../src/core/migrations';

const mk = () => {
  let t = 1_000_000;
  return new SaveManager(new MemoryStore(), () => (t += 1000));
};

describe('SaveManager', () => {
  it('saves and loads the game state', () => {
    const sm = mk();
    const s = createInitialState();
    s.finance.money = 12345;
    sm.save(s);
    const r = sm.load();
    expect(r.state?.finance.money).toBe(12345);
    expect(r.recovered).toBe(false);
  });

  it('returns null when nothing is saved', () => {
    expect(mk().load().state).toBeNull();
  });

  it('recovers from a corrupted current save using the previous save', () => {
    const store = new MemoryStore();
    const sm = new SaveManager(store);
    const s = createInitialState();
    s.finance.money = 1;
    sm.save(s);
    s.finance.money = 2;
    sm.save(s);
    store.setItem('hoteltycoon.save.current', '{broken json');
    const r = sm.load();
    expect(r.state?.finance.money).toBe(1);
    expect(r.recovered).toBe(true);
  });

  it('falls back to the newest backup when both saves are broken', () => {
    const store = new MemoryStore();
    const sm = new SaveManager(store);
    const s = createInitialState();
    s.finance.money = 777;
    sm.createBackup(s, 'manual');
    store.setItem('hoteltycoon.save.current', 'x');
    expect(sm.load().state?.finance.money).toBe(777);
  });

  it('creates, lists, restores and deletes backups', () => {
    const sm = mk();
    const g = new Game(sm);
    g.state.finance.money = 500;
    const b = g.createManualBackup();
    g.state.finance.money = 9;
    expect(sm.listBackups().map((x) => x.id)).toContain(b.id);
    expect(g.restoreBackup(b.id)).toBe(true);
    expect(g.state.finance.money).toBe(500);
    // Restoring creates a safety backup of the replaced state.
    expect(sm.listBackups().some((x) => x.kind === 'auto' && x.money === 9)).toBe(true);
    sm.deleteBackup(b.id);
    expect(sm.listBackups().some((x) => x.id === b.id)).toBe(false);
  });

  it('rotates backups per kind', () => {
    const sm = mk();
    const s = createInitialState();
    for (let i = 0; i < 14; i++) sm.createBackup(s, 'manual');
    for (let i = 0; i < 8; i++) sm.createBackup(s, 'auto');
    const list = sm.listBackups();
    expect(list.filter((b) => b.kind === 'manual')).toHaveLength(10);
    expect(list.filter((b) => b.kind === 'auto')).toHaveLength(5);
  });

  it('exports and imports a file', () => {
    const sm = mk();
    const s = createInitialState();
    s.meta.hotelName = 'בדיקה';
    const back = sm.importString(sm.exportString(s));
    expect(back.meta.hotelName).toBe('בדיקה');
    expect(() => sm.importString('{"magic":"nope"}')).toThrow();
    expect(() => sm.importString('not json')).toThrow();
  });

  it('rejects saves from a newer version', () => {
    const s: any = createInitialState();
    s.version = SAVE_VERSION + 1;
    expect(() => migrate(s)).toThrow();
  });

  it('creates an automatic backup every new day', () => {
    const sm = mk();
    const g = new Game(sm);
    g.state.clock.minute = 24 * 60 - 1;
    g.update(0.4);
    expect(g.state.clock.day).toBe(2);
    expect(sm.listBackups().filter((b) => b.kind === 'auto')).toHaveLength(1);
  });

  it('autosaves periodically', () => {
    const sm = mk();
    const g = new Game(sm);
    for (let i = 0; i < 70; i++) g.update(0.5);
    expect(sm.load().state).not.toBeNull();
  });
});
