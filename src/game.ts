// Pure game rules. No DOM here: functions mutate a Game and return events the UI animates.
import {
  BOSSES, BossKey, DEPTHS, MAX_RELICS, HOARDER_CAP, RELICS, RelicKey, START_GOLD, START_HP, SIGIL_DESC, SYM, Suit, StandardSuit, JOKER_EFFECTS,
  floorTarget, rankName, FLOORS,
} from './data';
import { Rng, int, mkRng, next, pickN, shuffle } from './rng';

export interface Card { id: number; suit: Suit; v: number; gild?: boolean; serr?: boolean; risen?: boolean }
export interface Slot { c: Card; hidden: boolean }
export interface Weapon { card: Card; last: number | null; chain: number; kills: number; trail: number[] }
export interface Ally { card: Card; power: number }
export interface Floor {
  boss: BossKey | null; target: number; glory: number;
  draw: Card[]; room: Slot[]; risenQueue: Card[];
  ally?: Ally | null; ward?: number;
  weapon: Weapon | null; kills: number; bonusFury: number;
  potionUsed: boolean; resolved: number; fleesLeft: number; fledLast: boolean; roomNo: number;
  cleared: boolean; bonusRooms: number; rng: Rng;
}
export type GoodKey = 'tonic' | 'sigil' | 'purge' | 'gild' | 'hone' | 'armory' | 'apoth' | 'bounty';
export interface Good { k: GoodKey; name: string; desc: string; cost: number; suit?: StandardSuit; sold: boolean }
export interface Shop { relics: { k: RelicKey; sold: boolean }[]; goods: Good[]; reroll: number; rng: Rng }
export interface Summary { lines: [string, number][]; total: number; glory: number; target: number }
export type Screen = 'starter' | 'play' | 'cleared' | 'shop' | 'dead' | 'victory';
export interface Game {
  version: 1; rulesVersion?: 2; seed: string; daily: boolean; screen: Screen;
  depth: number; fi: number; gold: number; hp: number; maxHp: number;
  relics: RelicKey[]; sigils: Record<StandardSuit, number>; deck: Card[]; bosses: BossKey[];
  totalGlory: number; f: Floor; shop: Shop | null; summary: Summary | null;
  log: string[]; cause: string; uid: number; bossSeen: boolean;
}

export type Ev =
  | { t: 'kill'; id: number; weapon: boolean; ally?: boolean; dmg: number; glory: number; dbl: boolean }
  | { t: 'heal'; id: number; n: number }
  | { t: 'gold'; n: number }
  | { t: 'fury'; id: number; n: number }
  | { t: 'equip'; id: number }
  | { t: 'ally'; id: number; power: number }
  | { t: 'ward'; id: number; n: number }
  | { t: 'wild'; id: number; name: string; text: string; good: boolean }
  | { t: 'break' }
  | { t: 'rise'; card: Card }
  | { t: 'flee' }
  | { t: 'target' }
  | { t: 'dead' }
  | { t: 'blind'; id: number }
  | { t: 'leave' };

export const isMon = (c: Card) => c.suit === 'S' || c.suit === 'C';
export const isCourt = (c: Card) => (c.suit === 'D' || c.suit === 'H') && c.v >= 11 && c.v <= 13;
export const isJoker = (c: Card) => c.suit === 'J';
export const isWeapon = (c: Card) => c.suit === 'D' && c.v <= 10;
export const isPotion = (c: Card) => c.suit === 'H' && c.v <= 10;
export const has = (G: Game, k: RelicKey) => G.relics.includes(k);
const BOSS_KEYS = Object.keys(BOSSES) as BossKey[];
const RELIC_KEYS = Object.keys(RELICS) as RelicKey[];
const STARTERS: RelicKey[] = ['whetstone', 'irongut', 'cloak', 'exec', 'scavenger'];

/** Starter offers have their own stream, so they cannot change the dungeon or bosses. */
export const starterChoices = (seed: string): RelicKey[] => pickN(mkRng(seed, 'starter'), STARTERS, 3);

function log(G: Game, t: string) { G.log.unshift(t); G.log.length = Math.min(G.log.length, 40); }
export const hoarderGlory = (G: Game) => Math.min(G.gold, HOARDER_CAP);
const cardName = (c: Card) => isJoker(c) ? 'Joker' : `${rankName(c.v)}${SYM[c.suit]}`;

function baseDeck(G: Game): Card[] {
  const d: Card[] = [];
  for (let v = 2; v <= 14; v++) d.push({ id: G.uid++, suit: 'S', v }, { id: G.uid++, suit: 'C', v });
  for (let v = 2; v <= 10; v++) d.push({ id: G.uid++, suit: 'D', v }, { id: G.uid++, suit: 'H', v });
  for (let v = 11; v <= 13; v++) d.push({ id: G.uid++, suit: 'D', v }, { id: G.uid++, suit: 'H', v });
  d.push({ id: G.uid++, suit: 'J', v: 0 }, { id: G.uid++, suit: 'J', v: 0 });
  return d;
}

export function newGame(seed: string, daily = false, chooseStarter = false): Game {
  const br = mkRng(seed, 'bosses');
  const bosses: BossKey[] = [];
  while (bosses.length < DEPTHS) bosses.push(...shuffle(br, [...BOSS_KEYS]));
  const G = {
    version: 1, rulesVersion: 2, seed, daily, screen: 'play', depth: 1, fi: 0, gold: START_GOLD, hp: START_HP, maxHp: START_HP,
    relics: [], sigils: { S: 0, C: 0, D: 0, H: 0 }, deck: [], bosses: bosses.slice(0, DEPTHS),
    totalGlory: 0, f: null as unknown as Floor, shop: null, summary: null, log: [], cause: '', uid: 1, bossSeen: false,
  } as Game;
  G.deck = baseDeck(G);
  startFloor(G);
  if (chooseStarter) G.screen = 'starter';
  return G;
}

/** Take one free starter, then replay the unchanged first-floor shuffle with its effects applied. */
export function chooseStarter(G: Game, k: RelicKey): boolean {
  if (G.screen !== 'starter' || !starterChoices(G.seed).includes(k)) return false;
  G.relics.push(k);
  applyRelic(G, k, 1);
  G.log = [];
  startFloor(G);
  log(G, `Took ${RELICS[k].name} as your starting relic.`);
  return true;
}

export function startFloor(G: Game) {
  const boss = G.fi === 2 ? G.bosses[G.depth - 1] : null;
  const rng = mkRng(G.seed, 'floor', G.depth, G.fi);
  G.f = {
    boss, target: floorTarget(G.depth, G.fi), glory: 0, draw: shuffle(rng, [...G.deck]), room: [], risenQueue: [],
    ally: null, ward: 0, weapon: null, kills: 0, bonusFury: 0, potionUsed: false, resolved: 0,
    fleesLeft: boss === 'warden' ? 0 : 1 + (has(G, 'cloak') ? 1 : 0), fledLast: false, roomNo: 0,
    cleared: false, bonusRooms: 0, rng,
  };
  G.screen = 'play';
  G.bossSeen = !boss;
  log(G, `Entered Depth ${G.depth} ${FLOORS[G.fi]}. Target: ${G.f.target} Glory.`);
  if (boss) log(G, `${BOSSES[boss].name}: ${BOSSES[boss].desc}`);
  dealRoom(G);
}

export const roomSize = (G: Game | null) => (G?.f?.boss === 'swarm' ? 5 : 4);
export const carry = (G: Game | null) => (G && has(G, 'packrat') ? 2 : 1);

function dealRoom(G: Game) {
  const f = G.f;
  const before = f.room.length;
  while (f.room.length < roomSize(G) && f.risenQueue.length) f.room.push({ c: f.risenQueue.shift()!, hidden: false });
  while (f.room.length < roomSize(G) && f.draw.length) f.room.push({ c: f.draw.shift()!, hidden: false });
  if (f.boss === 'mimic' && f.room.length > 1 && !f.room.some(s => s.hidden)) {
    const fresh = f.room.slice(before);
    if (fresh.length) fresh[int(f.rng, 0, fresh.length - 1)].hidden = true;
  }
  f.potionUsed = false; f.resolved = 0; f.roomNo++;
}

export function fleeState(G: Game): [boolean, string] {
  const f = G.f;
  if (f.boss === 'warden') return [false, 'The Warden bars the way'];
  if (f.fleesLeft <= 0) return [false, 'No flees left'];
  if (f.fledLast) return [false, 'You fled the last room'];
  if (f.resolved > 0) return [false, 'Only before you act'];
  if (!f.draw.length) return [false, 'Nowhere left to run'];
  return [true, `${f.fleesLeft} left · cards go to the bottom`];
}

export function flee(G: Game): Ev[] {
  const f = G.f;
  if (!fleeState(G)[0]) return [];
  f.draw.push(...f.room.map(s => s.c));
  f.room = []; f.fleesLeft--;
  dealRoom(G);
  f.fledLast = true;
  log(G, 'You fled. The room shuffles to the bottom of the dungeon.');
  return [{ t: 'flee' }];
}

export const weaponPower = (G: Game) => (G.f.weapon ? G.f.weapon.card.v + G.sigils.D : 0);

/** Printed value after boss effects (Hollow Crown). */
export function baseValue(G: Game, c: Card) {
  if (G.f.boss === 'crown' && isMon(c) && !c.risen && c.v >= 11 && c.v <= 13) return 15;
  return c.v;
}
/** Pack bonus: +1 per other face-up Beast in the room. */
export function packBonus(G: Game, c: Card) {
  if (c.suit !== 'C') return 0;
  return G.f.room.filter(s => s.c.id !== c.id && !s.hidden && s.c.suit === 'C').length;
}
export const strength = (G: Game, c: Card) => baseValue(G, c) + packBonus(G, c);

export function canWeapon(G: Game, c: Card) {
  const w = G.f.weapon;
  if (!w || !isMon(c)) return false;
  if (w.last == null) return true;
  const s = strength(G, c);
  return has(G, 'whetstone') ? s <= w.last : s < w.last;
}

export interface Score { str: number; valor: number; fury: number; dmg: number; blocked: number; glory: number; dbl: boolean }
function combatScore(G: Game, c: Card, mode: 'weapon' | 'brawl' | 'ally'): Score {
  const f = G.f, w = f.weapon, str = strength(G, c), useW = mode === 'weapon';
  let valor = str + (G.sigils[c.suit as StandardSuit] ?? 0) * 3;
  let fury = 1 + f.bonusFury;
  if (has(G, 'trophy')) fury += Math.floor(f.kills / 4);
  if (useW && w) { fury += w.chain; if (has(G, 'glass')) fury += 3; }
  else if (mode === 'brawl' && w && has(G, 'bloodletter')) fury += w.chain;
  const raw = mode === 'ally' ? 0 : useW ? Math.max(0, str - weaponPower(G)) : str;
  const blocked = Math.min(raw, f.ward ?? 0), dmg = raw - blocked;
  // A ward does not turn a damaging weapon into an Executioner strike.
  if (useW && raw === 0 && has(G, 'exec')) valor += weaponPower(G);
  let glory = valor * fury, dbl = false;
  const after = G.hp - dmg;
  if (has(G, 'duelist') && after > 0 && after <= 5) { glory *= 2; dbl = true; }
  return { str, valor, fury, dmg, blocked, glory, dbl };
}
export const killScore = (G: Game, c: Card, useW: boolean): Score => combatScore(G, c, useW ? 'weapon' : 'brawl');
export const canAlly = (G: Game, c: Card) => isMon(c) && !!G.f.ally && strength(G, c) <= G.f.ally.power;
export const allyScore = (G: Game, c: Card): Score => combatScore(G, c, 'ally');

export function courtEffect(G: Game, c: Card): { kind: 'fighter' | 'heal' | 'ward' | 'fury'; n: number } {
  if (!isCourt(c)) throw new Error('Not a court card');
  if (c.suit === 'D') return { kind: 'fighter', n: 8 + (c.v - 11) * 2 + G.sigils.D };
  if (c.v === 11) return { kind: 'heal', n: 6 + G.sigils.H * 2 };
  if (c.v === 12) return { kind: 'ward', n: 5 + G.sigils.H * 2 };
  return { kind: 'fury', n: 1 };
}

/** Add the new deck cards once, without changing an ongoing legacy room or shuffle. */
export function migrateGame(G: Game): Game {
  if (G.rulesVersion !== 2) {
    for (let v = 11; v <= 13; v++) G.deck.push({ id: G.uid++, suit: 'D', v }, { id: G.uid++, suit: 'H', v });
    G.deck.push({ id: G.uid++, suit: 'J', v: 0 }, { id: G.uid++, suit: 'J', v: 0 });
    G.rulesVersion = 2;
  }
  G.f.ally ??= null; G.f.ward ??= 0;
  return G;
}

export function healAmount(G: Game, c: Card) {
  let h = c.v + G.sigils.H * 2;
  if (G.f.boss === 'leech') h = Math.floor(h / 2);
  return h;
}

/** Cards still to resolve in this room before it advances. */
export function remaining(G: Game) {
  const f = G.f;
  const more = f.draw.length + f.risenQueue.length;
  return more ? Math.max(0, f.room.length - carry(G)) : f.room.length;
}

export type Mode = 'weapon' | 'brawl' | 'ally' | 'discard' | undefined;
export function resolve(G: Game, id: number, mode?: Mode): Ev[] {
  const f = G.f, ev: Ev[] = [];
  const idx = f.room.findIndex(s => s.c.id === id);
  if (idx < 0 || G.screen !== 'play') return ev;
  const slot = f.room[idx], c = slot.c;
  if (slot.hidden) {
    if (isMon(c)) mode = canWeapon(G, c) ? 'weapon' : canAlly(G, c) ? 'ally' : 'brawl';
    ev.push({ t: 'blind', id });
    log(G, `The Mimic's card was ${cardName(c)}.`);
  }
  if (mode === 'ally' && !canAlly(G, c)) return [];
  if (mode === 'discard' && !isJoker(c)) return [];
  // Score before removing the card: Pack counts the room as it stands.
  const useW = isMon(c) && mode === 'weapon' && canWeapon(G, c);
  const useAlly = isMon(c) && mode === 'ally';
  const score = isMon(c) ? useAlly ? allyScore(G, c) : killScore(G, c, useW) : null;
  f.room.splice(idx, 1);
  f.resolved++;
  if (c.gild) { G.gold += 3; ev.push({ t: 'gold', n: 3 }); }

  if (score) {
    G.f.ward = Math.max(0, (G.f.ward ?? 0) - score.blocked);
    if (useAlly) G.f.ally = null;
    G.hp -= score.dmg;
    if (G.hp <= 0) {
      G.hp = 0;
      G.cause = `Slain by a ${cardName(c)}`;
      ev.push({ t: 'kill', id, weapon: useW, ally: useAlly, dmg: score.dmg, glory: 0, dbl: false }, { t: 'dead' });
      die(G);
      return ev;
    }
    f.glory += score.glory; G.totalGlory += score.glory; f.kills++;
    ev.push({ t: 'kill', id, weapon: useW, ally: useAlly, dmg: score.dmg, glory: score.glory, dbl: score.dbl });
    if (has(G, 'tooth') && score.str > 10) { G.gold++; ev.push({ t: 'gold', n: 1 }); }
    if (useW) {
      const w = f.weapon!;
      w.last = score.str; w.chain++; w.kills++; w.trail.push(score.str);
      log(G, `Slew ${cardName(c)} with ♦${weaponPower(G)}: took ${score.dmg}, ${score.valor} × ${score.fury} = ${score.glory} Glory.`);
      if (f.boss === 'rust' && w.kills >= 3) { log(G, `Your ♦${w.card.v} rusts through and breaks.`); f.weapon = null; ev.push({ t: 'break' }); }
    } else if (useAlly) {
      log(G, `Your ally slew ${cardName(c)}: no damage, ${score.glory} Glory. Your weapon chain is unchanged.`);
    } else {
      log(G, `Brawled ${cardName(c)}: took ${score.dmg}, ${score.valor} × ${score.fury} = ${score.glory} Glory.`);
    }
    if (c.suit === 'S' && c.v >= 11 && !c.risen) {
      const risen: Card = { id: G.uid++, suit: 'S', v: Math.floor(baseValue(G, c) / 2), risen: true };
      f.risenQueue.push(risen);
      ev.push({ t: 'rise', card: risen });
      log(G, `The ${cardName(c)} will rise again as a ${risen.v}.`);
    }
  } else if (isCourt(c)) {
    const effect = courtEffect(G, c);
    if (effect.kind === 'fighter') {
      f.ally = { card: c, power: effect.n };
      ev.push({ t: 'ally', id, power: effect.n });
      log(G, `Recruited ${cardName(c)}: defeats one monster of strength ${effect.n} or less this floor.`);
    } else if (effect.kind === 'heal') {
      const n = Math.min(effect.n, G.maxHp - G.hp);
      G.hp += n; ev.push({ t: 'heal', id, n });
      log(G, `The Field Medic healed ${n} HP. Your room potion is still ${f.potionUsed ? 'used' : 'ready'}.`);
    } else if (effect.kind === 'ward') {
      f.ward = (f.ward ?? 0) + effect.n;
      ev.push({ t: 'ward', id, n: effect.n });
      log(G, `The Wardkeeper granted ${effect.n} ward this floor. Absorbs damage before HP.`);
    } else {
      f.bonusFury += effect.n; ev.push({ t: 'fury', id, n: effect.n });
      log(G, 'The War Chaplain granted +1 Fury this floor.');
    }
  } else if (isJoker(c)) {
    if (mode === 'discard') log(G, 'Dismissed the Joker. No bargain, no surprise.');
    else {
      const roll = int(mkRng(G.seed, 'joker', G.depth, G.fi, c.id), 0, JOKER_EFFECTS.length - 1);
      const effect = JOKER_EFFECTS[roll];
      let text: string;
      if (roll === 0) { G.gold += 4; text = '+4 gold'; }
      else if (roll === 1) { const n = Math.min(5, G.maxHp - G.hp); G.hp += n; text = `Healed ${n} HP`; }
      else if (roll === 2) { f.bonusFury++; text = '+1 Fury this floor'; }
      else if (roll === 3) { const n = Math.min(3, G.gold); G.gold -= n; text = `Lost ${n} gold`; }
      else if (roll === 4) { const n = Math.min(3, Math.max(0, G.hp - 1)); G.hp -= n; text = `Lost ${n} HP`; }
      else if (f.weapon) { f.weapon.chain = 0; text = 'Weapon chain lost. Wear stays.'; }
      else { const n = Math.min(2, G.gold); G.gold -= n; text = `Lost ${n} gold`; }
      ev.push({ t: 'wild', id, name: effect.name, text, good: effect.good });
      log(G, `Joker: ${effect.name}. ${text}.`);
    }
  } else if (isWeapon(c)) {
    const old = f.weapon;
    if (old && has(G, 'scavenger') && old.chain) { G.gold += old.chain; ev.push({ t: 'gold', n: old.chain }); }
    f.weapon = { card: c, last: null, chain: c.serr ? 1 : 0, kills: 0, trail: [] };
    ev.push({ t: 'equip', id });
    log(G, `Equipped ♦${c.v}${old ? ` (dropped ♦${old.card.v}, chain ${old.chain})` : ''}.`);
  } else {
    if (has(G, 'blood')) {
      f.bonusFury += 2; ev.push({ t: 'fury', id, n: 2 });
      log(G, `Drank ♥${c.v} for blood: +2 Fury this floor.`);
    } else if (!f.potionUsed) {
      const h = Math.min(healAmount(G, c), G.maxHp - G.hp);
      G.hp += h; f.potionUsed = true; ev.push({ t: 'heal', id, n: h });
      log(G, `Drank ♥${c.v}: healed ${h}.`);
    } else {
      G.gold += 2; ev.push({ t: 'gold', n: 2 });
      log(G, `Sold the spare ♥${c.v} for 2 gold.`);
    }
  }

  checkTarget(G, ev);
  const more = f.draw.length + f.risenQueue.length;
  const completed = more > 0 ? f.room.length <= carry(G) : f.room.length === 0;
  if (completed) {
    if (has(G, 'hoarder') && G.gold) { const n = hoarderGlory(G); f.glory += n; G.totalGlory += n; log(G, `Hoarder: +${n} Glory.`); checkTarget(G, ev); }
    if (f.cleared) f.bonusRooms++;
  }
  if (completed && more > 0) {
    f.fledLast = false;
    dealRoom(G);
  } else if (!f.room.length && !more) {
    if (f.cleared) { ev.push({ t: 'leave' }); leaveFloor(G); }
    else { G.cause = `The ${FLOORS[G.fi]} ran out of cards ${f.target - f.glory} Glory short`; ev.push({ t: 'dead' }); die(G); }
  }
  return ev;
}

function checkTarget(G: Game, ev: Ev[]) {
  const f = G.f;
  if (!f.cleared && f.glory >= f.target) {
    f.cleared = true; ev.push({ t: 'target' });
    log(G, `Target reached. Leave now, or press on for +1 gold per room.`);
  }
}

function die(G: Game) { G.screen = 'dead'; }

export function leaveFloor(G: Game) {
  const f = G.f;
  if (!f.cleared || G.screen !== 'play') return;
  const lines: [string, number][] = [];
  lines.push([`${FLOORS[G.fi]} cleared`, [4, 5, 6][G.fi]]);
  if (f.bonusRooms) lines.push([`Rooms past the target`, f.bonusRooms]);
  if (f.fleesLeft > 0) lines.push(['Unused flees', f.fleesLeft]);
  const interest = Math.min(5, Math.floor(G.gold / 5));
  if (interest) lines.push(['Interest (1 per 5 held)', interest]);
  if (G.fi === 2) { const hb = Math.floor(G.hp / 4); if (hb) lines.push(['Remaining HP (1 per 4)', hb]); }
  const total = lines.reduce((a, l) => a + l[1], 0);
  G.gold += total;
  G.summary = { lines, total, glory: f.glory, target: f.target };
  if (G.fi === 2) G.hp = G.maxHp;
  else G.hp += Math.ceil((G.maxHp - G.hp) / 2);
  G.screen = G.depth === DEPTHS && G.fi === 2 ? 'victory' : 'cleared';
}

export const nextFloor = (G: Game) => (G.fi === 2 ? { d: G.depth + 1, fi: 0 } : { d: G.depth, fi: G.fi + 1 });

/* ---------------- shop ---------------- */
function goodsPool(G: Game, r: Rng): Good[] {
  const suit = (['S', 'C', 'D', 'H'] as StandardSuit[])[int(r, 0, 3)];
  const g = (k: GoodKey, name: string, desc: string, cost: number, extra: Partial<Good> = {}): Good => ({ k, name, desc, cost, sold: false, ...extra });
  return [
    g('tonic', 'Tonic', 'Heal 8 HP now.', 3),
    g('sigil', `Sigil of ${SYM[suit]}`, `${SIGIL_DESC[suit]} Now level ${G.sigils[suit]}.`, 4 + G.sigils[suit] * 2, { suit }),
    g('purge', 'Purge', 'Remove one card from your deck.', 4),
    g('gild', 'Gilding Scroll', 'Gild a card: +3 gold each time you resolve it.', 3),
    g('hone', 'Honing Scroll', 'Make a ♦ Serrated: its chain starts at 1.', 3),
    g('armory', 'Armory Crate', 'Add a random ♦8–10 to your deck.', 4),
    g('apoth', 'Apothecary Crate', 'Add a random ♥7–10 to your deck.', 3),
    g('bounty', 'Bounty Notice', 'Add a random ♠/♣ J–A. More danger, more Valor.', 1),
  ];
}
function stock(G: Game, shop: Shop) {
  const owned = new Set(G.relics);
  shop.relics = pickN(shop.rng, RELIC_KEYS.filter(k => !owned.has(k)), 3).map(k => ({ k, sold: false }));
  shop.goods = pickN(shop.rng, goodsPool(G, shop.rng), 4);
}
export function openShop(G: Game) {
  const shop: Shop = { relics: [], goods: [], reroll: 2, rng: mkRng(G.seed, 'shop', G.depth, G.fi) };
  stock(G, shop);
  G.shop = shop; G.screen = 'shop';
}
export function reroll(G: Game) {
  const s = G.shop!;
  if (G.gold < s.reroll) return;
  G.gold -= s.reroll; s.reroll++;
  stock(G, s);
}
function applyRelic(G: Game, k: RelicKey, sign: 1 | -1) {
  if (k === 'irongut') { G.maxHp += 6 * sign; if (sign > 0) G.hp += 6; }
  if (k === 'glass') G.maxHp -= 6 * sign;
  G.hp = Math.max(1, Math.min(G.hp, G.maxHp));
}
export function buyRelic(G: Game, i: number) {
  const o = G.shop?.relics[i];
  if (!o || o.sold) return;
  const r = RELICS[o.k];
  if (G.gold < r.cost || G.relics.length >= MAX_RELICS) return;
  G.gold -= r.cost; G.relics.push(o.k); o.sold = true; applyRelic(G, o.k, 1);
}
export function sellRelic(G: Game, k: RelicKey) {
  const i = G.relics.indexOf(k);
  if (i < 0) return;
  G.relics.splice(i, 1); G.gold += Math.floor(RELICS[k].cost / 2); applyRelic(G, k, -1);
}
export const PICKERS = {
  purge: { title: 'Purge a card', ok: (_c: Card) => true },
  gild: { title: 'Gild a card', ok: (c: Card) => !c.gild },
  hone: { title: 'Hone a weapon', ok: (c: Card) => isWeapon(c) && !c.serr },
};
export type PickerKey = keyof typeof PICKERS;
export const needsPick = (g: Good): g is Good & { k: PickerKey } => g.k in PICKERS;

/** Buys a good. Returns false if it needs a card picked first (call pickGood). */
export function buyGood(G: Game, i: number): boolean {
  const g = G.shop?.goods[i];
  if (!g || g.sold || G.gold < g.cost) return true;
  if (needsPick(g)) return false;
  const r = G.shop!.rng;
  G.gold -= g.cost; g.sold = true;
  if (g.k === 'tonic') G.hp = Math.min(G.maxHp, G.hp + 8);
  if (g.k === 'sigil' && g.suit) G.sigils[g.suit]++;
  if (g.k === 'armory') G.deck.push({ id: G.uid++, suit: 'D', v: int(r, 8, 10) });
  if (g.k === 'apoth') G.deck.push({ id: G.uid++, suit: 'H', v: int(r, 7, 10) });
  if (g.k === 'bounty') G.deck.push({ id: G.uid++, suit: next(r) < 0.5 ? 'S' : 'C', v: int(r, 11, 14) });
  return true;
}
export function pickGood(G: Game, i: number, cardId: number) {
  const g = G.shop?.goods[i];
  const c = G.deck.find(x => x.id === cardId);
  if (!g || !c || g.sold || G.gold < g.cost || !needsPick(g) || !PICKERS[g.k].ok(c)) return;
  G.gold -= g.cost; g.sold = true;
  if (g.k === 'purge') G.deck = G.deck.filter(x => x.id !== cardId);
  if (g.k === 'gild') c.gild = true;
  if (g.k === 'hone') c.serr = true;
}
export function leaveShop(G: Game) {
  G.fi++;
  if (G.fi > 2) { G.fi = 0; G.depth++; }
  G.shop = null;
  startFloor(G);
}
