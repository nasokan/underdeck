// Reproducible visible-information playtest. Leaves scripts/sim.ts as the original greedy baseline.
// Usage: npx tsx scripts/playtest.ts [seed-count] [--out path-prefix] [--prefix AUDIT]
import { writeFileSync } from 'node:fs';
import { RelicKey, SYM, rankName } from '../src/data';
import { Game, chooseStarter, flee, leaveFloor, leaveShop, newGame, openShop, resolve, starterChoices } from '../src/game';
import { ShopChoice, chooseMove, shop } from './playtest-policy';
const args = process.argv.slice(2), count = Number(args.find(a => /^\d+$/.test(a)) ?? 100);
const option = (k: string, fallback: string) => { const i = args.indexOf(k); return i < 0 ? fallback : args[i + 1] ?? fallback; };
const prefix = option('--prefix', 'AUDIT'), out = option('--out', 'playtest');
if (!Number.isInteger(count) || count < 1)
  throw new Error('Seed count must be a positive integer.');
const pool: RelicKey[] = ['whetstone', 'irongut', 'cloak', 'exec', 'scavenger'];
function publicState(g: Game) {
  return {
    screen: g.screen, boss: g.f.boss, depth: g.depth, fi: g.fi, hp: g.hp, maxHp: g.maxHp, gold: g.gold,
    room: g.f.roomNo, glory: g.f.glory, target: g.f.target, ward: g.f.ward ?? 0,
    ally: g.f.ally ? { power: g.f.ally.power, cardId: g.f.ally.card.id } : null,
    weapon: g.f.weapon ? { id: g.f.weapon.card.id, value: g.f.weapon.card.v, last: g.f.weapon.last, chain: g.f.weapon.chain } : null,
    cards: g.f.room.map(s => s.hidden ? { id: s.c.id, hidden: true } : { id: s.c.id, suit: s.c.suit, value: s.c.v, risen: !!s.c.risen, gild: !!s.c.gild, serr: !!s.c.serr }),
    relics: [...g.relics], sigils: { ...g.sigils },
    ...(g.screen === 'shop' ? { shop: { relics: g.shop!.relics.map(o => ({ ...o })), goods: g.shop!.goods.map(o => ({ ...o })), reroll: g.shop!.reroll }, deck: g.deck.map(c => ({ id: c.id, suit: c.suit, value: c.v, gild: !!c.gild, serr: !!c.serr })) } : {}),
  };
}
interface FloorRow {
  depth: number;
  fi: number;
  target: number;
  glory: number;
  gold: number;
  deck: number;
  relics: RelicKey[];
  hp: number;
  actions: number;
  kills: number;
  rooms: number;
}
interface RunRow {
  boss: Game['f']['boss'];
  seed: string;
  starter: RelicKey;
  screen: string;
  depth: number;
  fi: number;
  cause: string;
  glory: number;
  target: number;
  floors: FloorRow[];
  steps: number;
}
const rows: RunRow[] = [];
let winningTrace: unknown = null;
let traceCoverage = -1;
for (let i = 0; i < count; i++) {
  const seed = `${prefix}${i}`;
  for (const starter of starterChoices(seed)) {
    const g = newGame(seed, false, true), trace: any[] = [];
    const capture = (action: unknown) => trace.push({ action, after: publicState(g) });
    chooseStarter(g, starter);
    capture({ type: 'chooseStarter', key: starter });
    const floors: FloorRow[] = [];
    let steps = 0, floorActions = 0;
    for (; steps < 3000; steps++) {
      const beforeScreen = g.screen;
      if (g.screen === 'play') {
        const move = chooseMove(g);
        floorActions++;
        let label = '';
        if (move.type === 'resolve') {
          const s = g.f.room.find(s => s.c.id === move.id)!;
          label = s.hidden ? 'Face-down card' : s.c.suit === 'J' ? 'Joker' : `${rankName(s.c.v)}${SYM[s.c.suit]}`;
        }
        if (move.type === 'leave')
          leaveFloor(g);
        else if (move.type === 'flee')
          flee(g);
        else
          resolve(g, move.id, move.mode);
        capture({ ...move, label });
      }
      else if (g.screen === 'cleared') {
        openShop(g);
        capture({ type: 'openShop' });
      }
      else if (g.screen === 'shop') {
        shop(g, (action: ShopChoice) => capture(action));
        leaveShop(g);
        capture({ type: 'leaveShop' });
        floorActions = 0;
      }
      else
        break;
      if (beforeScreen === 'play' && ['cleared', 'victory'].includes(String(g.screen)))
        floors.push({ depth: g.depth, fi: g.fi, target: g.f.target, glory: g.f.glory, gold: g.gold, deck: g.deck.length, relics: [...g.relics], hp: g.hp, actions: floorActions, kills: g.f.kills, rooms: g.f.roomNo });
    }
    rows.push({ seed, starter, screen: g.screen, boss: g.f.boss, depth: g.depth, fi: g.fi, cause: g.cause, glory: g.f.glory, target: g.f.target, floors, steps });
    if (g.screen === 'victory') {
      const resolves = trace.filter(t => t.action.type === 'resolve');
      const invokes = resolves.filter(t => t.action.label === 'Joker' && t.action.mode !== 'discard').length;
      const allyKills = resolves.filter(t => t.action.mode === 'ally').length;
      const coverage = (invokes > 0 ? 1000 : 0) + (allyKills > 0 ? 1000 : 0) - trace.length / 10000;
      if (coverage > traceCoverage) {
        traceCoverage = coverage;
        winningTrace = { seed, starter, steps: trace.length, invokes, allyKills, actions: trace };
      }
    }
  }
  if ((i + 1) % 25 === 0)
    console.error(`${i + 1}/${count} seeds complete`);
}
const rate = (n: number, d: number) => Number((100 * n / d).toFixed(1));
const report = pool.map(starter => {
  const rs = rows.filter(r => r.starter === starter), n = rs.length;
  return { starter, n, hall: rate(rs.filter(r => r.floors.some(f => f.depth === 1 && f.fi === 0)).length, n), clearedDepths: Array.from({ length: 8 }, (_, d) => rate(rs.filter(r => r.floors.some(f => f.depth === d + 1 && f.fi === 2)).length, n)), dry: rs.filter(r => r.cause.includes('ran out')).length, damage: rs.filter(r => r.screen === 'dead' && !r.cause.includes('ran out')).length, stalled: rs.filter(r => !['dead', 'victory'].includes(r.screen)).length };
});
const paired = [];
for (let a = 0; a < pool.length; a++)
  for (let b = a + 1; b < pool.length; b++) {
    const ar = new Map(rows.filter(r => r.starter === pool[a]).map(r => [r.seed, r])), br = new Map(rows.filter(r => r.starter === pool[b]).map(r => [r.seed, r]));
    const seeds = [...ar.keys()].filter(s => br.has(s));
    paired.push({ a: pool[a], b: pool[b], n: seeds.length, aWins: seeds.filter(s => ar.get(s)!.screen === 'victory').length, bWins: seeds.filter(s => br.get(s)!.screen === 'victory').length });
  }
console.log(JSON.stringify({ seedCount: count, runs: rows.length, report, paired }, null, 2));
writeFileSync(`${out}-cohort.json`, JSON.stringify({ seedCount: count, report, paired, runs: rows }, null, 2));
if (winningTrace)
  writeFileSync(`${out}-winning-trace.json`, JSON.stringify(winningTrace, null, 2));
