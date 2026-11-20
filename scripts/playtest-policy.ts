import { RELICS, RelicKey } from '../src/data';
import { Game, Mode, buyGood, buyRelic, allyScore, canAlly, canWeapon, fleeState, isJoker, isMon, isWeapon, killScore, pickGood, resolve, sellRelic, weaponPower } from '../src/game';
export type Choice = {
  type: 'leave';
} | {
  type: 'flee';
} | {
  type: 'resolve';
  id: number;
  mode?: Mode;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
function utility(g: Game) {
  if (g.screen === 'dead')
    return -100000;
  const f = g.f, w = f.weapon, progress = Math.min(1, f.glory / f.target);
  const hp = 5 * g.hp - 2 * Math.max(0, 8 - g.hp) ** 1.5;
  const weapon = w ? weaponPower(g) * 0.9 + Math.min(weaponPower(g) + 3, w.last ?? 20) * 1.0 + w.chain * 0.8 : 0;
  const support = (f.ally?.power ?? 0) * 1.5 + (f.ward ?? 0) * 3.5 + f.bonusFury * 5;
  return hp + weapon + support + Math.min(f.glory, f.target) * 0.20 + progress * 28 + g.gold * 0.8 + (f.cleared ? 350 : 0);
}
/** Plans only visible current-room sequences. Future cards and hidden identities are erased. */
export function chooseMove(real: Game): Choice {
  if (real.f.cleared)
    return { type: 'leave' };
  const g = clone(real), roomNo = g.f.roomNo;
  g.f.draw = g.f.draw.map((_, i) => ({ id: -1000 - i, suit: 'H', v: 5 }));
  for (const s of g.f.room)
    if (s.hidden)
      s.c = { id: s.c.id, suit: 'H', v: 5 };
  let best: {
    score: number;
    choice: Choice;
  } | null = null;
  const visit = (s: Game, first?: Choice): number => {
    if (s.screen !== 'play' || s.f.roomNo !== roomNo || s.f.cleared)
      return utility(s);
    let value = -100000;
    const visible = s.f.room.filter(x => !x.hidden);
    for (const slot of visible) {
      const c = slot.c;
      const modes: Mode[] = isMon(c)
        ? [...(canWeapon(s, c) ? ['weapon' as const] : []), ...(canAlly(s, c) ? ['ally' as const] : []), 'brawl']
        : isJoker(c) ? ['discard'] : [undefined];
      let discardValue: number | null = null;
      for (const mode of modes) {
        if (isMon(c) && (mode === 'ally' ? allyScore(s, c) : killScore(s, c, mode === 'weapon')).dmg >= s.hp)
          continue;
        const n = clone(s);
        resolve(n, c.id, mode);
        const move: Choice = { type: 'resolve', id: c.id, mode };
        const score = visit(n, first ?? move);
        if (isJoker(c) && mode === 'discard') discardValue = score;
        value = Math.max(value, score);
        if (!first && (!best || score > best.score))
          best = { score, choice: move };
      }
      if (isJoker(c)) {
        // Expected utility over the public six-outcome table; never execute a seeded gamble in planning.
        const resetCost = s.f.weapon ? s.f.weapon.chain * 0.8 : Math.min(2, s.gold) * 0.8;
        const expected = (4 * 0.8 + Math.min(5, s.maxHp - s.hp) * 5 + 5 - Math.min(3, s.gold) * 0.8 - Math.min(3, s.hp - 1) * 5 - resetCost) / 6;
        const score = (discardValue ?? utility(s)) + expected;
        value = Math.max(value, score);
        if (!first && expected > 0 && (!best || score > best.score))
          best = { score, choice: { type: 'resolve', id: c.id } };
      }
    }
    // A blind card is an uncertain exit from this branch, never read or resolved by the planner.
    const blind = s.f.room.find(x => x.hidden);
    if (blind) {
      const expectedDamage = s.f.weapon ? 3 : 6;
      const score = utility(s) - expectedDamage * 5 + 5;
      value = Math.max(value, score);
      if (!first && (!best || score > best.score))
        best = { score, choice: { type: 'resolve', id: blind.c.id } };
    }
    return value;
  };
  visit(g);
  const found = best as {
    score: number;
    choice: Choice;
  } | null;
  // Running costs one finite flee and forgoes the room's visible progress.
  if (fleeState(real)[0] && (!found || found.score < utility(g) - 17))
    return { type: 'flee' };
  if (found)
    return found.choice;
  return { type: 'resolve', id: real.f.room[0].c.id, mode: 'brawl' };
}
const rank: Record<RelicKey, number> = { irongut: 10, whetstone: 9, packrat: 10, exec: 9, trophy: 8, hoarder: 7, scavenger: 6, tooth: 4, bloodletter: 4, duelist: 3, cloak: 5, glass: 0, blood: -10 };
export type ShopChoice = {
  type: 'buyRelic';
  index: number;
  key: RelicKey;
} | {
  type: 'buyGood';
  index: number;
  name: string;
} | {
  type: 'sellRelic';
  key: RelicKey;
} | {
  type: 'pickGood';
  index: number;
  name: string;
  cardId: number;
};
export function shop(g: Game, onAction?: (action: ShopChoice, g: Game) => void) {
  const takeRelic = (i: number) => {
    const o = g.shop!.relics[i];
    if (o.sold || g.gold < RELICS[o.k].cost || g.relics.length >= 5) return;
    buyRelic(g, i);
    onAction?.({ type: 'buyRelic', index: i, key: o.k }, g);
  };
  const takeGood = (i: number) => {
    const o = g.shop!.goods[i];
    if (o.sold || g.gold < o.cost) return;
    buyGood(g, i);
    if (o.sold) onAction?.({ type: 'buyGood', index: i, name: o.name }, g);
  };
  const sell = (key: RelicKey) => {
    sellRelic(g, key);
    onAction?.({ type: 'sellRelic', key }, g);
  };
  const pick = (i: number, id: number) => {
    const o = g.shop!.goods[i];
    pickGood(g, i, id);
    if (o.sold) onAction?.({ type: 'pickGood', index: i, name: o.name, cardId: id }, g);
  };
  const sh = g.shop!;
  // Preserve health first. Buying a max-HP relic also heals by six.
  const gut = sh.relics.findIndex(o => !o.sold && o.k === 'irongut');
  if (gut >= 0 && g.relics.length < 5 && g.gold >= RELICS.irongut.cost)
    takeRelic(gut);
  const tonic = sh.goods.findIndex(o => !o.sold && o.k === 'tonic');
  if (tonic >= 0 && g.maxHp - g.hp >= 5)
    takeGood(tonic);
  const offers = sh.relics.map((o, i) => ({ o, i, rank: rank[o.k] + (o.k === 'hoarder' ? Math.min(6, g.gold / 6) : 0) })).sort((a, b) => b.rank - a.rank);
  for (const { o, i, rank: r } of offers) {
    if (o.sold || r < 3)
      continue;
    if (g.relics.length === 5) {
      const worst = [...g.relics].sort((a, b) => rank[a] - rank[b])[0];
      if (r >= rank[worst] + 3 && g.gold + Math.floor(RELICS[worst].cost / 2) >= RELICS[o.k].cost)
        sell(worst);
    }
    takeRelic(i);
  }
  const goods = sh.goods.map((o, i) => ({ o, i, rank: o.k === 'sigil' ? (o.suit === 'D' ? 10 : o.suit === 'H' ? 8 : 5) : o.k === 'armory' ? 7 : o.k === 'apoth' ? 4 : o.k === 'purge' ? 6 : o.k === 'hone' ? 3 : o.k === 'gild' ? 2 : 0 })).sort((a, b) => b.rank - a.rank);
  for (const { o, i, rank: r } of goods) {
    if (o.sold || r === 0 || g.gold < o.cost)
      continue;
    if (o.k === 'purge') {
      const bad = [...g.deck].filter(c => c.suit === 'C' && c.v >= 10).sort((a, b) => b.v - a.v)[0];
      if (bad)
        pick(i, bad.id);
    }
    else if (o.k === 'hone') {
      const c = [...g.deck].filter(c => isWeapon(c) && !c.serr).sort((a, b) => b.v - a.v)[0];
      if (c)
        pick(i, c.id);
    }
    else if (o.k === 'gild') {
      const c = [...g.deck].filter(c => !c.gild && (c.suit === 'D' || c.suit === 'H')).sort((a, b) => b.v - a.v)[0];
      if (c)
        pick(i, c.id);
    }
    else
      takeGood(i);
  }
}
