import { GAME_BALANCE } from '../data/catalog';
import type { GameState } from '../state/types';

export const MINUTES_PER_DAY = 24 * 60;
export const GAME_MINUTES_PER_REAL_SECOND = MINUTES_PER_DAY / GAME_BALANCE.realSecondsPerGameDay;

export interface ClockStep {
  /** Game minutes advanced in this step. */
  minutes: number;
  /** Days that started during this step (usually 0 or 1). */
  newDays: number[];
}

/** Advances the game clock by real elapsed seconds, honouring the speed setting. */
export function advanceClock(clock: GameState['clock'], realSeconds: number): ClockStep {
  const minutes = realSeconds * GAME_MINUTES_PER_REAL_SECOND * clock.speed;
  const newDays: number[] = [];
  if (minutes <= 0) return { minutes: 0, newDays };
  clock.minute += minutes;
  while (clock.minute >= MINUTES_PER_DAY) {
    clock.minute -= MINUTES_PER_DAY;
    clock.day += 1;
    newDays.push(clock.day);
  }
  return { minutes, newDays };
}

export function formatTime(minute: number): string {
  const m = Math.floor(minute) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Day 1 is a Sunday. */
export function weekday(day: number): number {
  return (day - 1) % 7;
}

/** 0 = full daylight, 1 = deep night. Smooth dusk (18-21) and dawn (5-7.5). */
export function nightFactor(minute: number): number {
  const h = minute / 60;
  if (h >= 7.5 && h < 18) return 0;
  if (h >= 21 || h < 5) return 1;
  if (h >= 18) return smooth((h - 18) / 3);
  return 1 - smooth((h - 5) / 2.5);
}

/** Warm golden-hour tint factor, peaks around 18:30 and 6:30. */
export function goldenFactor(minute: number): number {
  const h = minute / 60;
  const peak = (c: number, w: number) => Math.max(0, 1 - Math.abs(h - c) / w);
  return Math.max(peak(18.6, 1.6), peak(6.4, 1.2));
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
