import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/game';
import { loadGame, loadMotion, saveGame, saveMotion } from '../src/save';

let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('compatible saves and presentation settings', () => {
  it('keeps a legacy v1 run in play, without granting a new starter', () => {
    const legacy = newGame('LEGACY');
    saveGame(legacy);
    expect(loadGame()?.screen).toBe('play');
    expect(loadGame()?.relics).toEqual([]);
  });
  it('resumes a pending starter choice without changing dungeon state', () => {
    const pending = newGame('PENDING', false, true);
    saveGame(pending);
    expect(loadGame()).toEqual(pending);
  });
  it('saves motion independently from the run and defaults unknown settings to auto', () => {
    const run = newGame('MOTION'); saveGame(run);
    expect(loadMotion()).toBe('auto');
    saveMotion('reduced');
    expect(loadMotion()).toBe('reduced');
    expect(loadGame()).toEqual(run);
    stored.set('underdeck-motion-v1', '"future-setting"');
    expect(loadMotion()).toBe('auto');
  });
  it('keeps playing when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
    expect(() => saveMotion('reduced')).not.toThrow();
    expect(() => saveGame(newGame('BLOCKED'))).not.toThrow();
    expect(loadGame()).toBeNull();
    expect(loadMotion()).toBe('auto');
  });
});
