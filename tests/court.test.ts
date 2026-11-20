import { describe, expect, it } from 'vitest';
import { JOKER_EFFECTS, floorTarget } from '../src/data';
import { Card, Game, allyScore, canAlly, canWeapon, courtEffect, isCourt, isJoker, killScore, migrateGame, newGame, PICKERS, resolve, startFloor } from '../src/game';
function setup(cards: Omit<Card, 'id'>[]) {
  const g = newGame('COURT01');
  g.f.target = 9999;
  g.f.room = cards.map(c => ({ c: { ...c, id: g.uid++ }, hidden: false }));
  return g;
}
const deckCard = (g: Game, suit: Card['suit'], v: number) => g.deck.find(c => c.suit === suit && c.v === v)!;

describe('court deck and compatible migration', () => {
  it('deals 52 unique cards including six red court cards and two Jokers', () => {
    const g = newGame('COURT01');
    expect(g.deck).toHaveLength(52);
    expect(new Set(g.deck.map(c => c.id)).size).toBe(52);
    expect(g.deck.filter(isCourt)).toHaveLength(6);
    expect(g.deck.filter(isJoker)).toHaveLength(2);
    expect([...g.f.room.map(s => s.c), ...g.f.draw]).toHaveLength(52);
    expect(g.deck.some(c => (c.suit === 'D' || c.suit === 'H') && c.v === 14)).toBe(false);
  });
  it('migrates old saves once, without replacing the current room, draw, progress or relics', () => {
    const g = newGame('LEGACY');
    delete g.rulesVersion; delete g.f.ally; delete g.f.ward;
    g.deck = g.deck.filter(c => !isCourt(c) && !isJoker(c));
    g.f.draw = g.f.draw.filter(c => !isCourt(c) && !isJoker(c));
    g.f.room = g.f.room.filter(s => !isCourt(s.c) && !isJoker(s.c));
    const before = JSON.stringify({ room: g.f.room, draw: g.f.draw, hp: g.hp, screen: g.screen, relics: g.relics });
    migrateGame(g);
    expect(g.deck).toHaveLength(52);
    expect(JSON.stringify({ room: g.f.room, draw: g.f.draw, hp: g.hp, screen: g.screen, relics: g.relics })).toBe(before);
    const ids = g.deck.map(c => c.id);
    migrateGame(g);
    expect(g.deck.map(c => c.id)).toEqual(ids);
    expect(g.f.ally).toBeNull(); expect(g.f.ward).toBe(0);
  });
  it('never treats diamond courts as weapons eligible for honing', () => {
    const g = newGame('COURT01');
    for (const v of [11, 12, 13]) expect(PICKERS.hone.ok(deckCard(g, 'D', v))).toBe(false);
    expect(PICKERS.hone.ok(deckCard(g, 'D', 10))).toBe(true);
  });
});

describe('fighters and support', () => {
  it('recruits a one-use fighter that kills independently of weapon chain and can trigger Rise', () => {
    const g = setup([{ suit: 'D', v: 13 }, { suit: 'S', v: 11 }, { suit: 'H', v: 2 }, { suit: 'D', v: 2 }]);
    const [king, monster] = g.f.room.map(s => s.c);
    g.f.weapon = { card: deckCard(g, 'D', 8), chain: 3, kills: 2, trail: [13, 9], last: 9 };
    resolve(g, king.id);
    expect(g.f.ally?.power).toBe(12);
    expect(canWeapon(g, monster)).toBe(false); expect(canAlly(g, monster)).toBe(true);
    expect(allyScore(g, monster)).toMatchObject({ dmg: 0, fury: 1, glory: 11 });
    const hp = g.hp; const weapon = JSON.stringify(g.f.weapon);
    const ev = resolve(g, monster.id, 'ally');
    expect(g.hp).toBe(hp); expect(g.f.ally).toBeNull();
    expect(JSON.stringify(g.f.weapon)).toBe(weapon);
    expect(ev.some(e => e.t === 'kill' && e.ally)).toBe(true);
    expect(g.f.risenQueue[0]).toMatchObject({ suit: 'S', v: 5, risen: true });
  });
  it('rejects an ally attack against excessive effective Pack strength without consuming anything', () => {
    const g = setup([{ suit: 'C', v: 8 }, { suit: 'C', v: 2 }, { suit: 'H', v: 2 }]);
    g.f.ally = { card: deckCard(g, 'D', 11), power: 8 };
    const before = JSON.stringify(g);
    expect(canAlly(g, g.f.room[0].c)).toBe(false);
    expect(resolve(g, g.f.room[0].c.id, 'ally')).toEqual([]);
    expect(JSON.stringify(g)).toBe(before);
  });
  it('has distinct rank effects, sigil scaling and floor-limited companions and ward', () => {
    const g = newGame('COURT01'); g.sigils.D = 2; g.sigils.H = 1;
    for (const [v, power] of [[11, 10], [12, 12], [13, 14]]) expect(courtEffect(g, deckCard(g, 'D', v))).toEqual({ kind: 'fighter', n: power });
    expect(courtEffect(g, deckCard(g, 'H', 11))).toEqual({ kind: 'heal', n: 8 });
    expect(courtEffect(g, deckCard(g, 'H', 12))).toEqual({ kind: 'ward', n: 7 });
    expect(courtEffect(g, deckCard(g, 'H', 13))).toEqual({ kind: 'fury', n: 1 });
    g.f.ally = { card: deckCard(g, 'D', 13), power: 12 }; g.f.ward = 7; g.f.bonusFury = 3;
    startFloor(g);
    expect(g.f.ally).toBeNull(); expect(g.f.ward).toBe(0); expect(g.f.bonusFury).toBe(0);
  });
  it('medics heal independently of potions, Blood Price and Leech', () => {
    const g = setup([{ suit: 'H', v: 11 }, { suit: 'H', v: 10 }, { suit: 'S', v: 2 }]);
    g.hp = 5; g.f.potionUsed = true; g.f.boss = 'leech'; g.relics = ['blood'];
    const [medic, potion] = g.f.room.map(s => s.c);
    resolve(g, medic.id);
    expect(g.hp).toBe(11); expect(g.f.potionUsed).toBe(true); expect(g.f.bonusFury).toBe(0);
    resolve(g, potion.id); expect(g.hp).toBe(11); expect(g.f.bonusFury).toBe(2);
  });
  it('absorbs only actual incoming damage, consumes ward once and previews fatalities correctly', () => {
    const g = setup([{ suit: 'H', v: 12 }, { suit: 'S', v: 6 }, { suit: 'S', v: 4 }, { suit: 'H', v: 2 }]);
    const [queen, monster] = g.f.room.map(s => s.c);
    g.hp = 2; resolve(g, queen.id);
    expect(g.f.ward).toBe(5);
    expect(killScore(g, monster, false)).toMatchObject({ blocked: 5, dmg: 1 });
    resolve(g, monster.id, 'brawl');
    expect(g.hp).toBe(1); expect(g.f.ward).toBe(0); expect(g.screen).toBe('play');
  });
  it('grants a floor Fury buff to both ally and weapon scores, without manufacturing an Executioner bonus from ward', () => {
    const g = setup([{ suit: 'H', v: 13 }, { suit: 'C', v: 9 }, { suit: 'H', v: 2 }]);
    const [king, monster] = g.f.room.map(s => s.c);
    g.relics = ['exec']; g.f.weapon = { card: deckCard(g, 'D', 8), chain: 0, kills: 0, last: null, trail: [] }; g.f.ward = 5;
    resolve(g, king.id);
    expect(allyScore(g, monster).fury).toBe(2);
    expect(killScore(g, monster, true)).toMatchObject({ dmg: 0, blocked: 1, valor: 9, fury: 2 });
  });
  it('Hollow Crown only buffs monsters, not allies', () => {
    const g = newGame('COURT01'); g.f.boss = 'crown';
    expect(courtEffect(g, deckCard(g, 'D', 13)).n).toBe(12);
  });
});

describe('late-depth scoring', () => {
  it('keeps the opening four Depths unchanged and adds a bounded late target premium', () => {
    const oldTarget = (depth: number, floor: number) => Math.round((([35, 60, 90][floor] * 1.45 ** (depth - 1))) / 5) * 5;
    for (let d = 1; d <= 4; d++) for (let f = 0; f < 3; f++) expect(floorTarget(d, f)).toBe(oldTarget(d, f));
    expect(floorTarget(5, 2)).toBe(420);
    expect(floorTarget(8, 2)).toBe(1475);
    for (let d = 5; d <= 8; d++) for (let f = 0; f < 3; f++) {
      expect(floorTarget(d, f)).toBeGreaterThan(oldTarget(d, f));
      expect(floorTarget(d, f)).toBeLessThanOrEqual(oldTarget(d, f) * 1.23);
    }
  });
  it('caps Hoarder at 20 per completed room without spending the held gold', () => {
    const g = setup([{ suit: 'H', v: 2 }]); g.f.draw = []; g.relics = ['hoarder']; g.gold = 150; g.f.target = 20;
    resolve(g, g.f.room[0].c.id);
    expect(g.f.glory).toBe(20); expect(g.totalGlory).toBe(20); expect(g.screen).toBe('cleared');
    expect(g.summary?.glory).toBe(20); expect(g.gold).toBeGreaterThan(150);
  });
});

describe('seeded Joker bargains', () => {
  it('supports a safe dismissal without rolling or altering HP, gold, Fury or chain', () => {
    const g = setup([{ suit: 'J', v: 0 }, { suit: 'S', v: 4 }, { suit: 'H', v: 2 }]);
    const before = [g.hp, g.gold, g.f.bonusFury];
    const ev = resolve(g, g.f.room[0].c.id, 'discard');
    expect([g.hp, g.gold, g.f.bonusFury]).toEqual(before);
    expect(ev.some(e => e.t === 'wild')).toBe(false);
    expect(g.f.room.some(s => s.c.suit === 'J')).toBe(false);
  });
  it('replays every possible good/bad outcome exactly across JSON save/load, with bounded losses', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const g = setup([{ suit: 'J', v: 0 }, { suit: 'S', v: 4 }, { suit: 'H', v: 2 }]);
      g.seed = `WILD${i}`; g.hp = 2; g.gold = 1;
      const clone: Game = JSON.parse(JSON.stringify(g));
      const ev = resolve(g, g.f.room[0].c.id);
      expect(resolve(clone, clone.f.room[0].c.id)).toEqual(ev);
      expect(clone).toEqual(g);
      expect(g.hp).toBeGreaterThanOrEqual(1); expect(g.gold).toBeGreaterThanOrEqual(0);
      expect(g.hp).toBeLessThanOrEqual(7); expect(g.gold).toBeLessThanOrEqual(5);
      const outcome = ev.find(e => e.t === 'wild'); if (outcome?.t === 'wild') seen.add(outcome.name);
    }
    expect(seen).toEqual(new Set(JOKER_EFFECTS.map(e => e.name)));
  });
  it('never directly kills a player on one HP', () => {
    for (let i = 0; i < 60; i++) {
      const g = setup([{ suit: 'J', v: 0 }, { suit: 'S', v: 4 }, { suit: 'H', v: 2 }]); g.seed = `RISK${i}`; g.hp = 1;
      resolve(g, g.f.room[0].c.id);
      expect(g.hp).toBeGreaterThanOrEqual(1); expect(g.screen).toBe('play');
    }
  });
});
