import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseStarter, newGame, starterChoices } from '../src/game';
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
  it('loads an actual 44-card legacy save and persists the expanded deck without changing the current floor', () => {
    const legacy = newGame('OLD44');
    legacy.deck = legacy.deck.filter(c => c.id <= 44); legacy.uid = 45;
    delete legacy.rulesVersion; delete legacy.f.ally; delete legacy.f.ward;
    legacy.f.room = legacy.f.room.filter(s => s.c.id <= 44);
    legacy.f.draw = legacy.f.draw.filter(c => c.id <= 44);
    const before = JSON.stringify({ room: legacy.f.room, draw: legacy.f.draw, hp: legacy.hp, screen: legacy.screen });
    saveGame(legacy);
    const resumed = loadGame()!;
    expect(resumed.deck).toHaveLength(52);
    expect(JSON.stringify({ room: resumed.f.room, draw: resumed.f.draw, hp: resumed.hp, screen: resumed.screen })).toBe(before);
    saveGame(resumed);
    expect(loadGame()?.deck).toHaveLength(52);
    expect(new Set(loadGame()?.deck.map(c => c.id)).size).toBe(52);
  });
  it('upgrades a legacy pending starter into the new dungeon exactly once', () => {
    const pending = newGame('OLDSTART', false, true);
    pending.deck = pending.deck.filter(c => c.id <= 44); pending.uid = 45; delete pending.rulesVersion;
    saveGame(pending);
    const resumed = loadGame()!;
    expect(chooseStarter(resumed, starterChoices(resumed.seed)[0])).toBe(true);
    expect(resumed.f.room.length + resumed.f.draw.length).toBe(52);
    expect(resumed.relics).toHaveLength(1);
    saveGame(resumed); expect(loadGame()?.deck).toHaveLength(52);
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
