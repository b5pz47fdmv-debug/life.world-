import { describe, expect, it } from 'vitest';
import { advanceClock, formatTime, nightFactor, weekday, GAME_MINUTES_PER_REAL_SECOND } from '../src/core/GameClock';

describe('GameClock', () => {
  it('advances by speed and rolls over days', () => {
    const c = { day: 1, minute: 23 * 60 + 50, speed: 2 as const };
    const step = advanceClock(c, 10 / (GAME_MINUTES_PER_REAL_SECOND * 2) + 1e-9 + 5 / GAME_MINUTES_PER_REAL_SECOND / 2);
    expect(step.newDays).toEqual([2]);
    expect(c.day).toBe(2);
    expect(Math.round(c.minute)).toBe(5);
  });
  it('does not move while paused', () => {
    const c = { day: 1, minute: 600, speed: 0 as const };
    expect(advanceClock(c, 100).minutes).toBe(0);
    expect(c.minute).toBe(600);
  });
  it('a game day lasts 240 real seconds at x1', () => {
    const c = { day: 1, minute: 0, speed: 1 as const };
    advanceClock(c, 240);
    expect(c.day).toBe(2);
  });
  it('formats time and weekday', () => {
    expect(formatTime(8 * 60 + 5.7)).toBe('08:05');
    expect(weekday(1)).toBe(0);
    expect(weekday(8)).toBe(0);
  });
  it('night factor is 0 at noon and 1 at midnight', () => {
    expect(nightFactor(12 * 60)).toBe(0);
    expect(nightFactor(0)).toBe(1);
    const dusk = nightFactor(19.5 * 60);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
  });
});
