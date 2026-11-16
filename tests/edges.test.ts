import { describe, expect, it } from 'vitest';
import {
  Card, Game, buyRelic, canWeapon, fleeState, newGame, openShop, resolve, sellRelic, startFloor,
} from '../src/game';

function room(g: Game, cards: Omit<Card, 'id'>[]) {
  g.f.room = cards.map(c => ({ c: { ...c, id: g.uid++ }, hidden: false }));
  g.f.resolved = 0;
  return g.f.room.map(s => s.c);
}

describe('rules edge cases', () => {
  it('Swarm with Pack Rat carries two and deals risen cards before the draw pile', () => {
    const g = newGame('EDGES1');
    g.relics = ['packrat']; g.f.boss = 'swarm'; g.hp = g.maxHp = 100;
    const c = room(g, [
      { suit: 'S', v: 11 }, { suit: 'H', v: 2 }, { suit: 'H', v: 3 },
      { suit: 'D', v: 2 }, { suit: 'D', v: 3 },
    ]);
    resolve(g, c[0].id, 'brawl'); resolve(g, c[1].id); resolve(g, c[2].id);
    expect(g.f.room).toHaveLength(5);
    expect(g.f.room.slice(0, 3).map(s => [s.c.suit, s.c.v, s.c.risen])).toEqual([
      ['D', 2, undefined], ['D', 3, undefined], ['S', 5, true],
    ]);
  });

  it('the last original card rises into another room without a draw pile', () => {
    const g = newGame('EDGES1');
    g.f.target = 999; g.f.draw = []; g.hp = g.maxHp = 100;
    const [last] = room(g, [{ suit: 'S', v: 11 }]);
    resolve(g, last.id, 'brawl');
    expect(g.screen).toBe('play');
    expect(g.f.room[0].c).toMatchObject({ v: 5, risen: true });
    resolve(g, g.f.room[0].c.id, 'brawl');
    expect(g.screen).toBe('dead');
    expect(g.cause).toContain('ran out');
  });

  it('Crown halves its fifteen-value undead into a seven-value risen card', () => {
    const g = newGame('EDGES1');
    g.f.boss = 'crown'; g.hp = g.maxHp = 100;
    const [jack] = room(g, [
      { suit: 'S', v: 11 }, { suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'D', v: 3 },
    ]);
    resolve(g, jack.id, 'brawl');
    expect(g.f.risenQueue[0]).toMatchObject({ v: 7, risen: true });
  });

  it('weapon wear stores effective Pack strength and enforces a strictly lower next kill', () => {
    const g = newGame('EDGES1');
    const [weapon, beast, equal] = room(g, [
      { suit: 'D', v: 10 }, { suit: 'C', v: 9 }, { suit: 'C', v: 10 }, { suit: 'H', v: 2 },
    ]);
    resolve(g, weapon.id); resolve(g, beast.id, 'weapon');
    expect(g.f.weapon?.last).toBe(10);
    expect(canWeapon(g, equal)).toBe(false);
  });

  it('fatal damage after the target still ends the run without completion rewards', () => {
    const g = newGame('EDGES1');
    g.f.target = 1; g.f.glory = 1; g.f.cleared = true; g.hp = 2;
    g.relics = ['hoarder']; g.gold = 5;
    g.f.draw = []; g.f.risenQueue = [];
    const [fatal] = room(g, [{ suit: 'C', v: 3 }]);
    resolve(g, fatal.id, 'brawl');
    expect(g.screen).toBe('dead');
    expect(g.summary).toBe(null);
    expect(g.f.glory).toBe(1);
    expect(g.f.bonusRooms).toBe(0);
  });

  it('Warden overrides the extra Cloak flee', () => {
    const g = newGame('EDGES1');
    g.relics = ['cloak']; g.fi = 2; g.bosses[0] = 'warden';
    startFloor(g);
    expect(g.f.fleesLeft).toBe(0);
    expect(fleeState(g)[0]).toBe(false);
  });

  it('each Blood Price potion gives Fury without spare-potion gold', () => {
    const g = newGame('EDGES1');
    g.relics = ['blood'];
    const [first, second] = room(g, [
      { suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'D', v: 3 }, { suit: 'C', v: 3 },
    ]);
    const gold = g.gold;
    resolve(g, first.id); resolve(g, second.id);
    expect(g.f.bonusFury).toBe(4);
    expect(g.gold).toBe(gold);
  });

  it('selling Glass and Iron Gut preserves max HP deltas and clamps health', () => {
    const g = newGame('EDGES1');
    g.relics = ['glass', 'irongut']; g.maxHp = 20; g.hp = 20;
    sellRelic(g, 'irongut');
    expect(g.maxHp).toBe(14); expect(g.hp).toBe(14);
    sellRelic(g, 'glass');
    expect(g.maxHp).toBe(20); expect(g.hp).toBe(14);
  });

  it('JSON continuation preserves shop purchases and remaining random state', () => {
    const a = newGame('EDGES1');
    openShop(a); a.gold = 999;
    const b = JSON.parse(JSON.stringify(a));
    for (let i = 0; i < 3; i++) { buyRelic(a, i); buyRelic(b, i); }
    expect(a).toEqual(b);
  });
});
