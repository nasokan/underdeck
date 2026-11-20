// Balance check: a simple greedy bot plays many seeded runs. It plays badly, so treat results as a floor.
// Usage: npm run sim -- [runs] [--starter]
import { DEPTHS, FLOORS } from '../src/data';
import {
  Game, Mode, allyScore, canAlly, courtEffect, isCourt, isJoker, buyGood, buyRelic, canWeapon, chooseStarter, fleeState, flee, healAmount, isMon, killScore, leaveFloor, leaveShop, newGame, openShop, resolve, starterChoices,
} from '../src/game';

function step(G: Game) {
  const f = G.f;
  if (f.cleared) return leaveFloor(G);
  let best: { id: number; mode?: Mode; score: number } | null = null;
  const consider = (o: NonNullable<typeof best>) => { if (!best || o.score > best.score) best = o; };
  for (const s of f.room) {
    const c = s.c;
    if (s.hidden) { consider({ id: c.id, score: -20 }); continue; }
    if (isJoker(c)) { consider({ id: c.id, mode: 'discard', score: 0 }); continue; }
    if (isCourt(c)) {
      const e = courtEffect(G, c);
      const score = e.kind === 'fighter' ? (e.n - (f.ally?.power ?? 0)) * 3 : e.kind === 'heal' ? Math.min(e.n, G.maxHp - G.hp) * 5 : e.kind === 'ward' ? e.n * 3 : 30;
      consider({ id: c.id, score }); continue;
    }
    if (isMon(c)) {
      if (canAlly(G, c)) { const k = allyScore(G, c); consider({ id: c.id, mode: 'ally', score: k.glory + k.str - 8 }); }
      if (canWeapon(G, c)) { const k = killScore(G, c, true); if (k.dmg < G.hp) consider({ id: c.id, mode: 'weapon', score: k.glory - k.dmg * 4 + k.str }); }
      const k = killScore(G, c, false); if (k.dmg < G.hp) consider({ id: c.id, mode: 'brawl', score: k.glory - k.dmg * 8 });
    } else if (c.suit === 'D') {
      const w = f.weapon; consider({ id: c.id, score: !w ? 60 : (c.v - (w.last ?? w.card.v)) * 5 - w.chain * 4 });
    } else consider({ id: c.id, score: f.potionUsed ? 1 : Math.min(healAmount(G, c), G.maxHp - G.hp) * 5 });
  }
  const b = best as { id: number; mode?: Mode; score: number } | null;
  if (fleeState(G)[0] && (!b || b.score < -30)) return flee(G);
  if (!b) return resolve(G, f.room[0].c.id, 'brawl');
  resolve(G, b.id, b.mode);
}

function play(seed: string) {
  const G = newGame(seed, false, withStarter);
  if (withStarter) chooseStarter(G, starterChoices(seed)[0]);
  for (let i = 0; i < 50000; i++) {
    if (G.screen === 'play') step(G);
    else if (G.screen === 'cleared') openShop(G);
    else if (G.screen === 'shop') {
      for (let r = 0; r < 3; r++) buyRelic(G, r);
      G.shop!.goods.forEach((g, gi) => { if (['sigil', 'tonic', 'armory'].includes(g.k)) buyGood(G, gi); });
      leaveShop(G);
    } else break;
  }
  return G;
}

const args = process.argv.slice(2);
const withStarter = args.includes('--starter');
const runs = Number(args.find(a => !a.startsWith('--')) ?? 3000);
if (!Number.isInteger(runs) || runs < 1) throw new Error('Run count must be a positive integer.');
const res = Array.from({ length: runs }, (_, i) => play(`SIM${i}`));
const reach = (d: number, fi: number) => res.filter(G => G.screen === 'victory' || G.depth > d || (G.depth === d && G.fi > fi)).length / runs;
console.log(`${runs} bot runs${withStarter ? ' (first offered starter)' : ' (no starter)'}`);
for (let d = 1; d <= DEPTHS; d++) console.log(`  cleared Depth ${d} ${FLOORS[2]}: ${(reach(d, 2) * 100).toFixed(1)}%`);
console.log(`  cleared Depth 1 Hall: ${(reach(1, 0) * 100).toFixed(1)}%`);
const dry = res.filter(G => G.cause.includes('ran out')).length;
console.log(`  deaths by running dry: ${dry}, by damage: ${res.filter(G => G.screen === 'dead').length - dry}`);
