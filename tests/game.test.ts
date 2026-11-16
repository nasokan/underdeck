import { describe, expect, it } from 'vitest';
import { Card, Game, buyRelic, canWeapon, flee, fleeState, killScore, leaveFloor, newGame, openShop, packBonus, resolve, strength } from '../src/game';

/** Replace the current room with specific cards (ids stay unique). */
function setRoom(G: Game, cards: Omit<Card, 'id'>[]) {
  G.f.room = cards.map(c => ({ c: { ...c, id: G.uid++ }, hidden: false }));
  G.f.resolved = 0;
  return G.f.room.map(s => s.c);
}
const fresh = (seed = 'TEST01') => newGame(seed);

describe('seeds', () => {
  it('same seed deals the same dungeon and bosses', () => {
    const a = fresh('ABCDEF'), b = fresh('ABCDEF');
    expect(a.f.room.map(s => [s.c.suit, s.c.v])).toEqual(b.f.room.map(s => [s.c.suit, s.c.v]));
    expect(a.bosses).toEqual(b.bosses);
  });
  it('different seeds differ', () => {
    expect(fresh('AAAAAA').f.draw.map(c => c.v).join()).not.toEqual(fresh('BBBBBB').f.draw.map(c => c.v).join());
  });
});

describe('scoring', () => {
  it('chain raises Fury and weapon wear limits targets', () => {
    const G = fresh();
    const [w, q, n] = setRoom(G, [{ suit: 'D', v: 8 }, { suit: 'S', v: 12 }, { suit: 'S', v: 9 }, { suit: 'H', v: 2 }]);
    resolve(G, w.id);
    expect(killScore(G, q, true)).toMatchObject({ dmg: 4, valor: 12, fury: 1, glory: 12 });
    resolve(G, q.id, 'weapon');
    expect(killScore(G, n, true)).toMatchObject({ dmg: 1, fury: 2, glory: 18 });
    expect(canWeapon(G, { id: -1, suit: 'S', v: 12 })).toBe(false);
  });
  it('brawl takes full damage and keeps the chain', () => {
    const G = fresh();
    const [w, a, b, c] = setRoom(G, [{ suit: 'D', v: 5 }, { suit: 'S', v: 6 }, { suit: 'S', v: 3 }, { suit: 'S', v: 4 }]);
    resolve(G, w.id); resolve(G, a.id, 'weapon');
    const hp = G.hp;
    resolve(G, b.id, 'brawl');
    expect(G.hp).toBe(hp - 3);
    expect(G.f.weapon!.chain).toBe(1);
    expect(killScore(G, c, true).fury).toBe(2);
  });
});

describe('Beasts: Pack', () => {
  it('adds +1 strength per other face-up club', () => {
    const G = fresh();
    const [a] = setRoom(G, [{ suit: 'C', v: 5 }, { suit: 'C', v: 3 }, { suit: 'C', v: 9 }, { suit: 'S', v: 4 }]);
    expect(packBonus(G, a)).toBe(2);
    expect(strength(G, a)).toBe(7);
    expect(killScore(G, a, false)).toMatchObject({ dmg: 7, valor: 7 });
  });
  it('ignores face-down clubs', () => {
    const G = fresh();
    const [a] = setRoom(G, [{ suit: 'C', v: 5 }, { suit: 'C', v: 3 }, { suit: 'H', v: 2 }, { suit: 'D', v: 2 }]);
    G.f.room[1].hidden = true;
    expect(packBonus(G, a)).toBe(0);
  });
});

describe('Undead: Rise', () => {
  it('a face-card spade rises at half value into the next room, once', () => {
    const G = fresh();
    G.hp = 20;
    const [k] = setRoom(G, [{ suit: 'S', v: 13 }, { suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'D', v: 2 }]);
    const ev = resolve(G, k.id, 'brawl');
    expect(ev.some(e => e.t === 'rise')).toBe(true);
    expect(G.f.risenQueue[0]).toMatchObject({ suit: 'S', v: 6, risen: true });
    resolve(G, G.f.room[0].c.id); resolve(G, G.f.room[0].c.id);
    const risen = G.f.room.find(s => s.c.risen);
    expect(risen).toBeTruthy();
    G.hp = 20;
    const ev2 = resolve(G, risen!.c.id, 'brawl');
    expect(ev2.some(e => e.t === 'rise')).toBe(false);
  });
  it('number spades do not rise', () => {
    const G = fresh();
    const [s] = setRoom(G, [{ suit: 'S', v: 10 }, { suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'D', v: 2 }]);
    expect(resolve(G, s.id, 'brawl').some(e => e.t === 'rise')).toBe(false);
  });
});

describe('floor flow', () => {
  it('reaching the target unlocks leaving but does not end the floor', () => {
    const G = fresh();
    G.f.target = 5;
    const [m] = setRoom(G, [{ suit: 'S', v: 6 }, { suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'D', v: 2 }]);
    const ev = resolve(G, m.id, 'brawl');
    expect(ev.some(e => e.t === 'target')).toBe(true);
    expect(G.screen).toBe('play');
    leaveFloor(G);
    expect(G.screen).toBe('cleared');
  });
  it('rooms past the target pay a bonus at leave time', () => {
    const G = fresh();
    G.f.target = 1;
    const ids = setRoom(G, [{ suit: 'H', v: 2 }, { suit: 'H', v: 3 }, { suit: 'H', v: 4 }, { suit: 'S', v: 2 }]);
    resolve(G, ids[3].id, 'brawl'); resolve(G, ids[0].id); resolve(G, ids[1].id);
    expect(G.f.bonusRooms).toBe(1);
    leaveFloor(G);
    expect(G.summary!.lines.find(l => l[0].startsWith('Rooms past'))![1]).toBe(1);
  });
  it('cannot flee twice in a row', () => {
    const G = fresh();
    G.f.fleesLeft = 3;
    flee(G);
    expect(fleeState(G)[0]).toBe(false);
  });
  it('relic slots cap at 5', () => {
    const G = fresh();
    G.gold = 999;
    for (let n = 0; n < 4; n++) { openShop(G); for (let i = 0; i < 3; i++) buyRelic(G, i); }
    expect(G.relics.length).toBe(5);
  });
});
