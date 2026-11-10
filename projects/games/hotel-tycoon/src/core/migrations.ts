import { SAVE_VERSION, type GameState } from '../state/types';

/**
 * Save migrations: key = version being upgraded FROM.
 * When GameState changes shape, bump SAVE_VERSION and add `[old]: (s) => { ...; s.version = old + 1; return s; }`.
 */
const MIGRATIONS: Record<number, (s: any) => any> = {};

export class SaveFormatError extends Error {}

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new SaveFormatError('not an object');
  let s = raw as any;
  if (typeof s.version !== 'number') throw new SaveFormatError('missing version');
  if (s.version > SAVE_VERSION) throw new SaveFormatError('save is from a newer game version');
  while (s.version < SAVE_VERSION) {
    const step = MIGRATIONS[s.version];
    if (!step) throw new SaveFormatError(`no migration from v${s.version}`);
    s = step(s);
  }
  assertShape(s);
  return s as GameState;
}

function assertShape(s: any): void {
  const ok =
    s.meta && typeof s.meta.hotelName === 'string' &&
    s.clock && typeof s.clock.day === 'number' && typeof s.clock.minute === 'number' &&
    s.finance && typeof s.finance.money === 'number' &&
    s.layout && Array.isArray(s.layout.buildings) && Array.isArray(s.layout.areas) &&
    Array.isArray(s.layout.furniture) && s.rooms && typeof s.rooms === 'object' &&
    s.pricing && typeof s.nextId === 'number';
  if (!ok) throw new SaveFormatError('invalid save structure');
}
