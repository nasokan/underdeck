import { describe, expect, it } from 'vitest';
import { RelicKey, START_GOLD, START_HP } from '../src/data';
import { chooseStarter, newGame, starterChoices, startFloor } from '../src/game';

const pool: RelicKey[] = ['whetstone', 'irongut', 'cloak', 'exec', 'scavenger'];
const seedOffering = (key: RelicKey) => {
  for (let i = 0; i < 100; i++) if (starterChoices(`START${i}`).includes(key)) return `START${i}`;
  throw new Error(`No test seed offers ${key}`);
};

describe('starting relics', () => {
  it('offers three distinct accessible relics reproducibly without mutating the pool', () => {
    const first = starterChoices('START01');
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);
    expect(first.every(k => pool.includes(k))).toBe(true);
    expect(starterChoices('START01')).toEqual(first);
    first.length = 0;
    expect(starterChoices('START01')).toHaveLength(3);
    expect(new Set(Array.from({ length: 30 }, (_, i) => starterChoices(`START${i}`).join())).size).toBeGreaterThan(1);
  });

  it('takes one offered relic for free and never grants a second choice', () => {
    const g = newGame('START01', false, true), choice = starterChoices(g.seed)[0];
    expect(g.screen).toBe('starter');
    expect(chooseStarter(g, choice)).toBe(true);
    expect(g.screen).toBe('play');
    expect(g.gold).toBe(START_GOLD);
    expect(g.relics).toEqual([choice]);
    const selected = JSON.stringify(g);
    expect(chooseStarter(g, choice)).toBe(false);
    expect(chooseStarter(g, starterChoices(g.seed)[1])).toBe(false);
    expect(JSON.stringify(g)).toBe(selected);
    expect(g.log.filter(s => s.startsWith('Entered'))).toHaveLength(1);
  });

  it('rejects an unoffered starter without changing the pending run', () => {
    const g = newGame('START01', false, true);
    const unoffered = pool.find(k => !starterChoices(g.seed).includes(k))!;
    const before = JSON.stringify(g);
    expect(chooseStarter(g, unoffered)).toBe(false);
    expect(chooseStarter(g, 'glass')).toBe(false);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('preserves pending and selected state through the save JSON format', () => {
    const pending = newGame('START01', true, true);
    const restored = JSON.parse(JSON.stringify(pending));
    const choice = starterChoices(pending.seed)[0];
    expect(chooseStarter(pending, choice)).toBe(true);
    expect(chooseStarter(restored, choice)).toBe(true);
    expect(restored).toEqual(pending);
    expect(JSON.parse(JSON.stringify(restored))).toEqual(pending);
    expect(restored.daily).toBe(true);
    expect(restored.version).toBe(1);
  });

  it('keeps old callers and existing play saves outside starter selection', () => {
    const legacy = JSON.parse(JSON.stringify(newGame('START01')));
    expect(legacy.screen).toBe('play');
    const before = JSON.stringify(legacy);
    expect(chooseStarter(legacy, starterChoices(legacy.seed)[0])).toBe(false);
    expect(JSON.stringify(legacy)).toBe(before);
  });

  it('applies Iron Gut HP and Cloak flee effects on the first floor exactly once', () => {
    const gut = newGame(seedOffering('irongut'), false, true);
    chooseStarter(gut, 'irongut');
    expect([gut.hp, gut.maxHp]).toEqual([START_HP + 6, START_HP + 6]);
    chooseStarter(gut, 'irongut');
    expect([gut.hp, gut.maxHp]).toEqual([START_HP + 6, START_HP + 6]);
    const cloak = newGame(seedOffering('cloak'), false, true);
    chooseStarter(cloak, 'cloak');
    expect(cloak.f.fleesLeft).toBe(2);
  });

  it('isolates starter randomness from current and future floor and boss streams', () => {
    for (let i = 0; i < 20; i++) {
      const seed = `STREAM${i}`;
      for (const choice of starterChoices(seed)) {
        const baseline = newGame(seed), upgraded = newGame(seed, false, true);
        chooseStarter(upgraded, choice);
        expect(upgraded.bosses).toEqual(baseline.bosses);
        expect(upgraded.f.room).toEqual(baseline.f.room);
        expect(upgraded.f.draw).toEqual(baseline.f.draw);
        expect(upgraded.f.rng).toEqual(baseline.f.rng);
        baseline.depth = upgraded.depth = 2;
        baseline.fi = upgraded.fi = 2;
        startFloor(baseline); startFloor(upgraded);
        expect(upgraded.f.room).toEqual(baseline.f.room);
        expect(upgraded.f.draw).toEqual(baseline.f.draw);
        expect(upgraded.f.rng).toEqual(baseline.f.rng);
      }
    }
  });
});
