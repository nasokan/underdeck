import { artDefs, bossArt, monsterArt, potionArt, relicIcon, weaponArt } from './art';
import { anim, center, countUp, fly, popup, pulse, shake, slash, wait } from './anim';
import {
  BOSSES, DEPTHS, FAMILY, FLOORS, MAX_RELICS, RELICS, RelicKey, SYM, bestiary, floorTarget, rankName,
} from './data';
import {
  Card, Ev, Game, Mode, PICKERS, buyGood, buyRelic, canWeapon, carry, flee, fleeState, has, healAmount, isMon,
  killScore, leaveFloor, leaveShop, needsPick, newGame, nextFloor, openShop, packBonus, pickGood, remaining,
  reroll, resolve, roomSize, sellRelic, strength, weaponPower,
} from './game';
import { SEED_RE, dailySeed, normalizeSeed, randomSeed } from './rng';
import { clearSave, loadGame, loadStats, recordRun, saveGame } from './save';

let G: Game | null = null;
let sel: number | null = null;
let picker: number | null = null; // index of the shop good waiting for a card pick
let modal: 'deck' | null = null;
let busy = false;
let seenIds = new Set<number>();
let sharedSeed: string | null = null;
let toast = '';

const $app = document.getElementById('app')!;
const q = <T extends Element = HTMLElement>(s: string) => $app.querySelector<T>(s);
const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));

/* ---------------- art + cards ---------------- */
function artFor(c: Card) {
  if (c.suit === 'S' || c.suit === 'C') return monsterArt(c.suit, c.v);
  return c.suit === 'D' ? weaponArt(c.v) : potionArt(c.v);
}

function tipFor(c: Card): string {
  if (!G) return '';
  if (c.suit === 'D') return `Power ${c.v + G.sigils.D}`;
  if (c.suit === 'H') {
    if (has(G, 'blood')) return '+2 Fury';
    return G.f.potionUsed ? 'Sell · 2g' : `Heal ${healAmount(G, c)}`;
  }
  if (canWeapon(G, c)) { const s = killScore(G, c, true); return `<b>−${s.dmg}</b> · ${s.glory}★`; }
  const s = killScore(G, c, false); return `<b>−${s.dmg}</b> · ${s.glory}★ bare`;
}

interface CardOpts { inRoom?: boolean; mini?: boolean; button?: string; dim?: boolean; selected?: boolean; i?: number }
function cardHTML(c: Card, o: CardOpts = {}) {
  const lore = bestiary(c.suit, c.v, c.risen);
  const tag = o.button ? 'button' : 'div';
  const shown = o.inRoom && G ? (isMon(c) ? strength(G, c) : c.v) : c.v;
  const pack = o.inRoom && G && c.suit === 'C' ? packBonus(G, c) : 0;
  const badges = [
    c.risen ? '<span class="badge risen">Risen</span>' : '',
    pack ? `<span class="badge pack">Pack +${pack}</span>` : '',
    c.gild ? '<span class="badge gild">Gilded</span>' : '',
    c.serr ? '<span class="badge serr">Serrated</span>' : '',
  ].join('');
  const cls = ['card', `s-${c.suit}`, c.gild ? 'gilded' : '', c.risen ? 'is-risen' : '', o.mini ? 'mini' : '', o.selected ? 'sel' : '', o.dim ? 'dim' : ''].join(' ');
  const label = `${rankName(c.v)} of ${SYM[c.suit]}, ${lore.name}${shown !== c.v ? `, strength ${shown}` : ''}`;
  return `<${tag} class="${cls}" data-id="${c.id}" ${o.button ?? ''} style="--d:${-((c.id * 0.73) % 3).toFixed(2)}s;--i:${o.i ?? 0}" aria-label="${esc(label)}">
    <span class="c-rank">${shown !== c.v ? `<s>${rankName(c.v)}</s>${shown}` : rankName(c.v)}<i>${SYM[c.suit]}</i></span>
    <span class="c-art">${artFor(c)}</span>
    ${o.mini ? '' : `<span class="c-name">${lore.name}</span>`}
    ${o.inRoom ? `<span class="c-tip">${tipFor(c)}</span>` : ''}
    <span class="c-badges">${badges}</span>
  </${tag}>`;
}
const backHTML = (c: Card, i: number) => `<button class="card back" data-id="${c.id}" data-act="sel" data-arg="${c.id}" style="--i:${i}" aria-label="Face-down card. Picking it resolves it blind.">
  <span class="back-eye"></span><span class="c-name">Blind</span></button>`;

/* ---------------- HUD ---------------- */
function hud() {
  const g = G!, f = g.f;
  const pct = Math.min(100, (f.glory / f.target) * 100);
  return `<header class="hud">
    <div class="hud-where">
      <div class="label">Depth ${g.depth}/${DEPTHS}${g.daily ? ' · Daily' : ''}</div>
      <h1>${FLOORS[g.fi]}${f.boss ? `<span class="boss-name"> · ${BOSSES[f.boss].name}</span>` : ''}</h1>
    </div>
    <div class="hud-glory ${f.cleared ? 'done' : ''}">
      <div class="row"><span class="label">Glory</span><span class="num"><b id="glory-num">${f.glory}</b> / ${f.target}</span></div>
      <div class="track"><i style="width:${pct}%"></i></div>
    </div>
    <div class="hud-gold"><span class="label">Gold</span><b class="num" id="gold-num">${g.gold}</b></div>
  </header>
  ${f.cleared ? `<div class="banner"><div><b>Target reached.</b> Leave now, or press on: +1 gold for each room you finish. Dying still ends the run.</div>
    <button class="btn primary" data-act="leave"><b>Leave the floor</b><small>L</small></button></div>` : ''}`;
}

function statusBar() {
  const g = G!, f = g.f, w = f.weapon;
  const hpPct = (g.hp / g.maxHp) * 100;
  const fb = f.bonusFury + (has(g, 'trophy') ? Math.floor(f.kills / 4) : 0);
  const weapon = w
    ? `<div class="wslot" id="wslot">${cardHTML(w.card, { mini: true })}
        <div class="wmeta"><span class="label">Chain</span><b class="chain num" id="chain">×${1 + w.chain + fb}</b>
        <small>${w.last == null ? 'Fresh: hits anything' : `Next kill ${has(g, 'whetstone') ? '≤' : '<'} ${w.last}`}</small>
        ${w.trail.length ? `<span class="trail">${w.trail.map(v => `<i>${v}</i>`).join('')}</span>` : ''}</div></div>`
    : `<div class="wslot" id="wslot"><div class="card mini empty-slot" aria-label="No weapon"><span>✕</span></div>
        <div class="wmeta"><span class="label">Bare hands</span><b class="chain num" id="chain">×${1 + fb}</b><small>Full damage</small></div></div>`;
  return `<section class="status">
    <div class="hp" id="hp"><div class="row"><span class="label">Health</span><span class="num"><b id="hp-num">${g.hp}</b>/${g.maxHp}</span></div>
      <div class="track hp-track"><i style="width:${hpPct}%"></i></div></div>
    ${weapon}
    <div class="minis">
      <div><span class="label">Dungeon</span><b class="num">${f.draw.length + f.risenQueue.length}</b></div>
      <div><span class="label">Flees</span><b class="num">${f.fleesLeft}</b></div>
      <div><span class="label">Potion</span><b>${has(g, 'blood') ? '—' : f.potionUsed ? 'Used' : 'Ready'}</b></div>
    </div>
  </section>`;
}

function actionsHTML() {
  const g = G!, f = g.f;
  const slot = f.room.find(s => s.c.id === sel);
  if (!slot) {
    const n = remaining(g);
    const more = f.draw.length + f.risenQueue.length;
    return `<div class="detail-empty"><b>Pick a card.</b> ${n} more to resolve in this room${more ? `; the last ${carry(g) > 1 ? carry(g) + ' carry' : 'one carries'} over` : ''}.</div>`;
  }
  const c = slot.c, lore = bestiary(c.suit, c.v, c.risen);
  let btns = '';
  if (isMon(c)) {
    if (f.weapon) {
      if (canWeapon(g, c)) {
        const s = killScore(g, c, true), fatal = s.dmg >= g.hp;
        btns += `<button class="btn primary ${fatal ? 'fatal' : ''}" data-act="fight"><b>${fatal ? 'Fight (fatal)' : `Fight with ♦${weaponPower(g)}`}</b><small>Take ${s.dmg} · ${s.valor}×${s.fury} = ${s.glory} Glory${s.dbl ? ' (Duelist ×2)' : ''}</small></button>`;
      } else btns += `<button class="btn" disabled><b>Weapon too worn</b><small>Last kill ${f.weapon.last}, this is ${strength(g, c)}</small></button>`;
    }
    const s = killScore(g, c, false), fatal = s.dmg >= g.hp, prim = !f.weapon || !canWeapon(g, c);
    btns += `<button class="btn ${prim ? 'primary' : ''} ${fatal ? 'fatal' : ''}" data-act="brawl"><b>${fatal ? 'Brawl (fatal)' : 'Brawl'}</b><small>Take ${s.dmg} · ${s.valor}×${s.fury} = ${s.glory} · keeps chain</small></button>`;
  } else if (c.suit === 'D') {
    btns += `<button class="btn primary" data-act="equip"><b>Equip ♦${c.v + g.sigils.D}</b><small>${f.weapon ? `Drops ♦${f.weapon.card.v}, resets chain ×${1 + f.weapon.chain}` : 'Your first weapon this floor'}${c.serr ? ' · starts ×2' : ''}</small></button>`;
  } else {
    const sub = has(g, 'blood') ? 'Blood Price: +2 Fury this floor' : f.potionUsed ? 'Already healed this room: sell for 2 gold' : `Heal ${Math.min(healAmount(g, c), g.maxHp - g.hp)} HP`;
    btns += `<button class="btn primary" data-act="drink"><b>Drink</b><small>${sub}</small></button>`;
  }
  const trait = isMon(c) ? `<span class="trait">${FAMILY[c.suit as 'S' | 'C'].name}: ${FAMILY[c.suit as 'S' | 'C'].trait}</span>` : '';
  return `<div class="lore"><b>${lore.name}</b> <span class="cap">${lore.caption}</span>${trait}</div>
    <div class="btns">${btns}<button class="btn ghosty" data-act="desel" aria-label="Cancel"><b>✕</b></button></div>`;
}

function relicList(sell: boolean) {
  const g = G!;
  if (!g.relics.length) return `<p class="muted">No relics yet. Buy them in the shop between floors (${MAX_RELICS} slots).</p>`;
  return `<div class="relics">${g.relics.map(k => `<div class="relic"><span class="r-icon">${relicIcon(k)}</span><div><b>${RELICS[k].name}</b><span>${RELICS[k].desc}</span>
    ${sell ? `<button class="link" data-act="sell" data-arg="${k}">Sell for ${Math.floor(RELICS[k].cost / 2)} gold</button>` : ''}</div></div>`).join('')}</div>`;
}

function rulesHTML(open = false) {
  return `<details class="rules" ${open ? 'open' : ''}><summary>How to play</summary><ul>
    <li>♠♣ are monsters, ♦ weapons, ♥ potions. Each room deals ${roomSize(G)} cards; resolve all but ${carry(G)}, the rest carries into the next room.</li>
    <li>Fighting with a weapon: take (monster − weapon) damage. After a kill, the weapon only hits monsters <i>below</i> its last kill.</li>
    <li><b>Glory = Valor × Fury.</b> Valor is the monster's strength. Fury is 1 + your weapon's chain, so long descending chains score big.</li>
    <li>Brawling takes full damage and scores ×1, but keeps your chain.</li>
    <li><b>Undead ♠</b> face cards rise once at half value in the next room. <b>Beasts ♣</b> get +1 strength per other ♣ in the room.</li>
    <li>One potion heals per room; extras sell for 2 gold. Flee an untouched room, never twice in a row.</li>
    <li>Reach the Glory target, then leave or press on. HP heals by half between floors and fully after each Lair.</li>
    <li>Keys: 1–5 pick, Enter acts, B brawl, F flee, L leave, Esc cancel.</li>
  </ul></details>`;
}

function playHTML() {
  const g = G!, f = g.f;
  const [canF, why] = fleeState(g);
  const cards = f.room.map((s, i) => (s.hidden ? backHTML(s.c, i) : cardHTML(s.c, { inRoom: true, button: `data-act="sel" data-arg="${s.c.id}"`, selected: sel === s.c.id, i }))).join('');
  const lairBoss = BOSSES[g.bosses[g.depth - 1]];
  return `${hud()}${statusBar()}
  <section class="room">
    <div class="roomhead"><div><h2>Room ${f.roomNo}</h2><span class="muted">${f.boss ? BOSSES[f.boss].desc : `Lair ahead: ${lairBoss.name}`}</span></div>
      <button class="btn small" data-act="flee" ${canF ? '' : 'disabled'}><b>Flee</b><small>${why}</small></button></div>
    <div class="cards" style="--n:${Math.max(4, roomSize(g))}">${cards}</div>
  </section>
  <section class="detail ${sel ? 'has-sel' : ''}" aria-live="polite">${actionsHTML()}</section>
  <section class="ledger">
    <div class="panel"><div class="label">Relics ${g.relics.length}/${MAX_RELICS}</div>${relicList(false)}${rulesHTML()}</div>
    <div class="panel"><div class="label">Ledger</div><div class="log">${g.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>
      ${seedBox()}</div>
  </section>
  ${!g.bossSeen && f.boss ? bossIntro() : ''}`;
}

function seedBox() {
  const g = G!;
  return `<div class="seedbox"><span class="label">Seed</span><code>${g.seed}</code>
    <button class="link" data-act="share">Copy link</button> <button class="link" data-act="deck">View deck</button>
    <button class="link" data-act="quit">Main menu</button>${toast ? `<span class="toast">${toast}</span>` : ''}</div>`;
}

function bossIntro() {
  const b = G!.f.boss!, d = BOSSES[b];
  return `<div class="modal boss-intro" role="dialog" aria-label="${d.name}"><div class="box">
    <div class="label">Depth ${G!.depth} · Lair</div>
    <div class="boss-art">${bossArt(b)}</div>
    <h2>${d.name}</h2><p class="cap">${d.caption}</p><p class="rule">${d.desc}</p>
    <button class="btn primary center" data-act="facboss"><b>Face it</b></button></div></div>`;
}

/* ---------------- screens ---------------- */
function titleHTML() {
  const st = loadStats(), save = loadGame();
  const fan = [monsterArt('S', 14), monsterArt('C', 13), weaponArt(10), monsterArt('S', 12), potionArt(9)];
  return `<div class="screen title">
    <div class="fan">${fan.map((a, i) => `<div class="card fan-card" style="--k:${i - 2}"><span class="c-art">${a}</span></div>`).join('')}</div>
    <div class="label">A Scoundrel roguelike</div>
    <h1 class="logo">Underdeck</h1>
    <p>Crawl eight depths of a dungeon built from a deck of cards. Kill monsters in falling order to build weapon chains: Glory is Valor × Fury, and Fury grows with every kill your weapon makes.</p>
    <div class="menu">
      ${sharedSeed ? `<button class="btn primary" data-act="seedrun" data-arg="${sharedSeed}"><b>Play shared seed ${sharedSeed}</b><small>Someone sent you this dungeon</small></button>` : ''}
      ${save ? `<button class="btn ${sharedSeed ? '' : 'primary'}" data-act="continue"><b>Continue</b><small>Depth ${save.depth} ${FLOORS[save.fi]} · seed ${save.seed}</small></button>` : ''}
      <button class="btn ${save || sharedSeed ? '' : 'primary'}" data-act="newrun"><b>New run</b><small>Random seed</small></button>
      <button class="btn" data-act="daily"><b>Daily dungeon</b><small>Same seed for everyone today: ${dailySeed()}</small></button>
      <form class="seedform" data-form="seed"><label for="seed-in" class="label">Play a seed</label>
        <div><input id="seed-in" name="seed" placeholder="e.g. K7Q2ZM" maxlength="12" autocomplete="off" spellcheck="false"><button class="btn small" type="submit"><b>Go</b></button></div></form>
    </div>
    ${st.runs ? `<p class="muted">Runs ${st.runs} · Wins ${st.wins}${st.best ? ` · Best: Depth ${st.best.depth} ${FLOORS[st.best.fi]}, ${st.best.glory} Glory (seed ${st.best.seed})` : ''}</p>` : ''}
    ${rulesHTML(!st.runs)}
  </div>`;
}

function clearedHTML() {
  const g = G!, s = g.summary!, nx = nextFloor(g);
  return `<div class="screen">
    <div class="label">Depth ${g.depth}</div><h2>${FLOORS[g.fi]} cleared</h2>
    <p>${s.glory} Glory against a target of ${s.target}.${g.fi === 2 ? ' Your wounds close: HP restored to full.' : ` You patch up half your wounds: HP ${g.hp}/${g.maxHp}.`}</p>
    <div class="panel rewards">${s.lines.map(l => `<div class="stat"><span>${l[0]}</span><span class="num">+${l[1]}</span></div>`).join('')}
      <div class="stat total"><span>Gold earned</span><span class="num">+${s.total}</span></div></div>
    <p class="muted">Next: Depth ${nx.d} ${FLOORS[nx.fi]}, target ${floorTarget(nx.d, nx.fi)} Glory.</p>
    <div><button class="btn primary center" data-act="shop"><b>Enter the shop</b></button></div>
  </div>`;
}

function shopHTML() {
  const g = G!, sh = g.shop!, nx = nextFloor(g);
  const nb = BOSSES[g.bosses[nx.d - 1]];
  const full = g.relics.length >= MAX_RELICS;
  return `<header class="hud shop-hud"><div class="hud-where"><div class="label">Between floors</div><h1>The Fence’s Stall</h1></div>
    <div class="hud-gold"><span class="label">Gold</span><b class="num">${g.gold}</b></div>
    <div class="shop-stats label">HP ${g.hp}/${g.maxHp} · Deck ${g.deck.length} · Sigils ${(['S', 'C', 'D', 'H'] as const).map(k => `${SYM[k]}${g.sigils[k]}`).join(' ')}</div></header>
  <div class="section-h"><h2>Relics</h2><span class="label">${g.relics.length}/${MAX_RELICS} slots</span></div>
  <div class="shopgrid">${sh.relics.map((o, i) => {
    const r = RELICS[o.k], ok = !o.sold && g.gold >= r.cost && !full;
    return `<div class="offer relic-offer ${o.sold ? 'sold' : ''}"><span class="r-icon big">${relicIcon(o.k)}</span><h3>${r.name}</h3><p>${r.desc}</p>
      <button class="btn center ${ok ? 'primary' : ''}" data-act="buyr" data-arg="${i}" ${ok ? '' : 'disabled'}><b>${o.sold ? 'Sold' : full ? 'Slots full' : `Buy · ${r.cost}g`}</b></button></div>`;
  }).join('') || '<p class="muted">You own every relic.</p>'}</div>
  <div class="section-h"><h2>Goods</h2><button class="btn small" data-act="reroll" ${g.gold < sh.reroll ? 'disabled' : ''}><b>Reroll · ${sh.reroll}g</b></button></div>
  <div class="shopgrid">${sh.goods.map((gd, i) => {
    const ok = !gd.sold && g.gold >= gd.cost;
    return `<div class="offer ${gd.sold ? 'sold' : ''}"><h3>${gd.name}</h3><p>${gd.desc}</p>
      <button class="btn center ${ok ? 'primary' : ''}" data-act="buyg" data-arg="${i}" ${ok ? '' : 'disabled'}><b>${gd.sold ? 'Sold' : `Buy · ${gd.cost}g`}</b></button></div>`;
  }).join('')}</div>
  <div class="section-h"><h2>Your relics</h2><button class="btn small" data-act="deck"><b>View deck</b></button></div>
  ${relicList(true)}
  <div class="panel next">
    <div><div class="label">Next floor</div><h3>Depth ${nx.d} ${FLOORS[nx.fi]} · ${floorTarget(nx.d, nx.fi)} Glory</h3>
      <div class="muted">${nx.fi === 2 ? `<b class="bad">${nb.name}</b>: ${nb.desc}` : `Lair boss this depth: ${nb.name}`}</div></div>
    <button class="btn primary center" data-act="leaveshop"><b>Descend</b></button>
  </div>`;
}

function endHTML(win: boolean) {
  const g = G!;
  return `<div class="screen end">
    <div class="label">${win ? 'Victory' : 'Run over'}</div>
    <h1 class="logo">${win ? 'You reached the bottom' : 'Fallen'}</h1>
    <p>${win ? `All ${DEPTHS} depths cleared.` : `${esc(g.cause)} on Depth ${g.depth}, ${FLOORS[g.fi]}.`} Total Glory: <b class="num">${g.totalGlory}</b>.</p>
    ${g.relics.length ? `<div><div class="label">Relics carried</div>${relicList(false)}</div>` : ''}
    <div class="menu">
      <button class="btn primary" data-act="seedrun" data-arg="${g.seed}"><b>Try seed ${g.seed} again</b></button>
      <button class="btn" data-act="newrun"><b>New random run</b></button>
      <button class="btn" data-act="share"><b>Copy link to this seed</b><small>${toast || 'Challenge a friend'}</small></button>
    </div>
  </div>`;
}

function modalHTML() {
  if (!G) return '';
  const sorted = [...G.deck].sort((a, b) => 'SCDH'.indexOf(a.suit) - 'SCDH'.indexOf(b.suit) || b.v - a.v);
  if (picker != null) {
    const gd = G.shop!.goods[picker];
    if (!needsPick(gd)) return '';
    const p = PICKERS[gd.k];
    return `<div class="modal" role="dialog" aria-label="${p.title}"><div class="box"><h2>${p.title}</h2>
      <div class="grid">${sorted.map(c => cardHTML(c, { mini: true, dim: !p.ok(c), button: `data-act="pick" data-arg="${c.id}" ${p.ok(c) ? '' : 'disabled'}` })).join('')}</div>
      <button class="btn" data-act="cancelpick"><b>Cancel</b></button></div></div>`;
  }
  if (modal === 'deck') {
    return `<div class="modal" role="dialog" aria-label="Your deck"><div class="box"><h2>Your deck · ${G.deck.length} cards</h2>
      <p class="muted">${(['S', 'C', 'D', 'H'] as const).map(k => `${SYM[k]} ${G!.deck.filter(c => c.suit === k).length}`).join(' · ')}</p>
      <div class="grid">${sorted.map(c => cardHTML(c, { mini: true })).join('')}</div>
      <button class="btn" data-act="closemodal"><b>Close</b></button></div></div>`;
  }
  return '';
}

/* ---------------- render ---------------- */
function render() {
  let h = '';
  if (!G) h = titleHTML();
  else if (G.screen === 'play') h = playHTML();
  else if (G.screen === 'cleared') h = clearedHTML();
  else if (G.screen === 'shop') h = shopHTML();
  else h = endHTML(G.screen === 'victory');
  $app.innerHTML = h + modalHTML();
  $app.dataset.screen = G ? G.screen : 'title';
  if (G?.screen === 'play') dealIn();
}

/** Animate cards that weren't on the table last render. */
function dealIn() {
  const els = Array.from($app.querySelectorAll<HTMLElement>('.room .card'));
  let k = 0;
  for (const el of els) {
    const id = Number(el.dataset.id);
    if (seenIds.has(id)) continue;
    const risen = el.classList.contains('is-risen');
    anim(el, risen
      ? [{ opacity: 0, transform: 'translateY(40px) scale(.85)', filter: 'blur(6px) brightness(2)' }, { opacity: 1, transform: 'none', filter: 'none' }]
      : [{ opacity: 0, transform: 'translateY(-36px) rotateY(85deg) rotate(-4deg)' }, { opacity: 1, transform: 'none' }],
      { duration: risen ? 700 : 420, delay: k++ * 80, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' });
  }
  seenIds = new Set(els.map(e => Number(e.dataset.id)));
}

function persist() {
  if (!G) return;
  if (G.screen === 'dead' || G.screen === 'victory') clearSave();
  else saveGame(G);
}

/* ---------------- action animations ---------------- */
async function doResolve(id: number, mode?: Mode) {
  if (!G || busy) return;
  const slot = G.f.room.find(s => s.c.id === id);
  if (!slot) return;
  busy = true;
  const cardEl = q(`.room .card[data-id="${id}"]`);
  const rect = cardEl?.getBoundingClientRect();
  const before = { glory: G.f.glory, gold: G.gold, hp: G.hp, chain: G.f.weapon?.chain ?? -1, cleared: G.f.cleared };

  if (slot.hidden && cardEl) { // flip the blind card face-up first
    await anim(cardEl, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: 180, easing: 'ease-in' });
    cardEl.outerHTML = cardHTML(slot.c, { inRoom: true });
    const fresh = q(`.room .card[data-id="${id}"]`);
    await anim(fresh, [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: 200, easing: 'ease-out' });
    await wait(350);
  }
  const target = q(`.room .card[data-id="${id}"]`);
  const ev = resolve(G, id, mode);
  await preAnimate(ev, target);
  sel = null;
  if (G.screen === 'dead') recordRun(G);
  if (G.screen === 'victory') recordRun(G);
  persist();
  render();
  postAnimate(ev, rect, before);
  busy = false;
}

async function preAnimate(ev: Ev[], cardEl: HTMLElement | null) {
  if (!cardEl) return;
  const wslot = q('#wslot .card');
  for (const e of ev) {
    if (e.t === 'kill') {
      if (e.weapon && wslot) {
        const a = wslot.getBoundingClientRect(), b = cardEl.getBoundingClientRect();
        const dx = (b.left - a.left) * 0.55, dy = (b.top - a.top) * 0.55;
        void anim(wslot, [
          { transform: 'none' },
          { transform: `translate(${dx}px, ${dy}px) rotate(-30deg) scale(1.15)`, offset: 0.45 },
          { transform: `translate(${dx * 1.05}px, ${dy * 1.05}px) rotate(25deg) scale(1.15)`, offset: 0.6 },
          { transform: 'none' },
        ], { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)' });
        await wait(230);
        void slash(cardEl, 'blade');
      } else {
        void slash(cardEl, 'fist');
      }
      cardEl.classList.add('hit');
      await anim(cardEl, [
        { transform: 'none', filter: 'none' },
        { transform: 'translateX(10px) rotate(4deg)', filter: 'brightness(1.6)', offset: 0.15 },
        { transform: 'translateX(-6px) rotate(-3deg)', filter: 'none', offset: 0.35 },
        { transform: 'translateY(40px) rotate(12deg) scale(.9)', opacity: 0 },
      ], { duration: 520, easing: 'ease-in', fill: 'forwards' });
      if (e.dmg > 0) void shake(q('#hp'), 5);
    } else if (e.t === 'equip') {
      const slotEl = q('#wslot .card');
      if (slotEl) await fly(cardEl, slotEl, 440);
    } else if (e.t === 'heal' || e.t === 'fury') {
      const hp = q('#hp');
      await anim(cardEl, [
        { transform: 'none', opacity: 1, filter: 'none' },
        { transform: 'translateY(-20px) scale(1.05)', opacity: 1, filter: 'drop-shadow(0 0 14px var(--moss))', offset: 0.4 },
        { transform: 'translateY(-60px) scale(.6)', opacity: 0 },
      ], { duration: 520, easing: 'ease-in', fill: 'forwards' });
      void anim(hp, [{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 3px var(--moss)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 600 });
    } else if (e.t === 'gold' && !ev.some(x => x.t === 'kill' || x.t === 'heal' || x.t === 'fury' || x.t === 'equip')) {
      await anim(cardEl, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-30px) scale(.7)', opacity: 0 }], { duration: 380, fill: 'forwards' });
    }
  }
}

function postAnimate(ev: Ev[], rect: DOMRect | undefined, before: { glory: number; gold: number; hp: number; chain: number; cleared: boolean }) {
  if (!G) return;
  const at = rect ? center(rect) : { x: innerWidth / 2, y: innerHeight / 3 };
  let delay = 0;
  for (const e of ev) {
    if (e.t === 'kill') {
      if (e.dmg > 0) { popup(`−${e.dmg}`, 'hurt', at.x - 30, at.y + 20, delay); }
      if (e.glory) { popup(`+${e.glory}${e.dbl ? ' ×2' : ''}`, 'glory', at.x + 20, at.y - 10, delay + 120); }
      if (e.dmg >= 6) void shake($app, Math.min(14, e.dmg));
      delay += 160;
    }
    if (e.t === 'heal') popup(`+${e.n} HP`, 'heal', at.x, at.y, delay);
    if (e.t === 'fury') popup(`+${e.n} Fury`, 'glory', at.x, at.y, delay);
    if (e.t === 'gold') popup(`+${e.n} gold`, 'gold', at.x, at.y + 30, delay + 200);
    if (e.t === 'break') popup('Weapon broke', 'hurt', at.x, at.y + 50, delay + 300);
    if (e.t === 'rise') popup('It will rise…', 'info', at.x, at.y + 50, delay + 300);
    if (e.t === 'target') {
      void anim(q('.banner'), [{ opacity: 0, transform: 'translateY(-12px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.3,1.2)' });
      void pulse(q('.hud-glory'), 1.06);
    }
  }
  if (G.screen !== 'play') return;
  countUp(q('#glory-num'), before.glory, G.f.glory);
  countUp(q('#gold-num'), before.gold, G.gold);
  countUp(q('#hp-num'), before.hp, G.hp);
  const chain = G.f.weapon?.chain ?? -1;
  if (chain > before.chain && chain > 0) void pulse(q('#chain'), 1.5);
  if (G.hp < before.hp) void anim(q('.hp-track i'), [{ filter: 'brightness(2.4)' }, { filter: 'none' }], { duration: 500 });
}

async function doFlee() {
  if (!G || busy || !fleeState(G)[0]) return;
  busy = true;
  const els = Array.from($app.querySelectorAll('.room .card'));
  await Promise.all(els.map((el, i) => anim(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(50px) rotate(6deg)', opacity: 0 }], { duration: 300, delay: i * 50, fill: 'forwards', easing: 'ease-in' })));
  flee(G); sel = null; persist(); render();
  busy = false;
}

/* ---------------- runs + sharing ---------------- */
function startRun(seed: string, daily = false) {
  G = newGame(seed, daily);
  sel = null; picker = null; modal = null; seenIds = new Set(); toast = ''; sharedSeed = null;
  try { history.replaceState(null, '', `#seed-${seed}`); } catch { /* sandboxed frames */ }
  persist(); render();
  window.scrollTo(0, 0);
}
async function share() {
  if (!G) return;
  const url = `${location.origin}${location.pathname}#seed-${G.seed}`;
  try { await navigator.clipboard.writeText(url); toast = 'Link copied'; }
  catch { toast = url; }
  render();
  setTimeout(() => { toast = ''; }, 2500);
}

/* ---------------- input ---------------- */
function act(a: string, arg?: string) {
  if (busy) return;
  switch (a) {
    case 'newrun': return startRun(randomSeed());
    case 'daily': return startRun(dailySeed(), true);
    case 'seedrun': return startRun(arg!);
    case 'continue': { const s = loadGame(); if (s) { G = s; seenIds = new Set(); sel = null; render(); } return; }
  }
  if (!G) return;
  switch (a) {
    case 'sel': {
      const s = G.f.room.find(x => x.c.id === Number(arg));
      if (!s) return;
      if (s.hidden) { void doResolve(s.c.id); return; }
      sel = sel === s.c.id ? null : s.c.id;
      break;
    }
    case 'desel': sel = null; break;
    case 'fight': if (sel != null) void doResolve(sel, 'weapon'); return;
    case 'brawl': if (sel != null) void doResolve(sel, 'brawl'); return;
    case 'equip': case 'drink': if (sel != null) void doResolve(sel); return;
    case 'flee': void doFlee(); return;
    case 'leave': leaveFloor(G); if (G.screen === 'victory') recordRun(G); break;
    case 'facboss': G.bossSeen = true; break;
    case 'shop': openShop(G); window.scrollTo(0, 0); break;
    case 'buyr': buyRelic(G, Number(arg)); break;
    case 'buyg': if (!buyGood(G, Number(arg))) picker = Number(arg); break;
    case 'pick': if (picker != null) { pickGood(G, picker, Number(arg)); picker = null; } break;
    case 'cancelpick': picker = null; break;
    case 'sell': sellRelic(G, arg as RelicKey); break;
    case 'reroll': reroll(G); break;
    case 'leaveshop': leaveShop(G); seenIds = new Set(); window.scrollTo(0, 0); break;
    case 'deck': modal = 'deck'; break;
    case 'closemodal': modal = null; break;
    case 'share': void share(); return;
    case 'quit': persist(); G = null; sel = null; render(); return;
  }
  persist();
  render();
  if (a === 'sel' && sel != null) void anim(q('.detail'), [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180 });
}

export function boot() {
  document.body.insertAdjacentHTML('afterbegin', artDefs());
  // Dev-only test hook (stripped from production builds).
  if (import.meta.env.DEV) Object.assign(window, { __ud: { get G() { return G; }, render } });
  const m = location.hash.match(/^#seed-([A-Za-z0-9]+)$/);
  const hashSeed = m ? normalizeSeed(m[1]) : null;
  const save = loadGame();
  if (hashSeed && SEED_RE.test(hashSeed)) {
    if (save && save.seed === hashSeed) G = save; // reloading your own run
    else sharedSeed = hashSeed;
  }
  $app.addEventListener('click', e => {
    const t = (e.target as Element).closest<HTMLElement>('[data-act]');
    if (!t || (t as HTMLButtonElement).disabled) return;
    act(t.dataset.act!, t.dataset.arg);
  });
  $app.addEventListener('submit', e => {
    const f = e.target as HTMLFormElement;
    if (f.dataset.form !== 'seed') return;
    e.preventDefault();
    const s = normalizeSeed(String(new FormData(f).get('seed') ?? ''));
    if (SEED_RE.test(s)) startRun(s);
    else { const i = f.querySelector('input'); i?.setCustomValidity('Seeds are 4–12 letters or digits.'); i?.reportValidity(); i?.setCustomValidity(''); }
  });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target as Element).closest('input')) return;
    if (e.key === 'Escape') { picker = null; modal = null; sel = null; return render(); }
    if (!G || G.screen !== 'play' || picker != null || modal || busy) return;
    if (!G.bossSeen) { if (e.key === 'Enter') { e.preventDefault(); act('facboss'); } return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 5) { const s = G.f.room[n - 1]; if (s) act('sel', String(s.c.id)); return; }
    const k = e.key.toLowerCase();
    if (k === 'f') return act('flee');
    if (k === 'l' && G.f.cleared) return act('leave');
    if (k === 'b' && sel != null) { const s = G.f.room.find(x => x.c.id === sel); if (s && isMon(s.c)) act('brawl'); return; }
    if (e.key === 'Enter' && sel != null) { const p = q<HTMLButtonElement>('.detail .btn.primary'); if (p) { e.preventDefault(); p.click(); } }
  });
  try { render(); }
  catch (err) { // a save from an older or broken version: drop it rather than show a blank page
    console.error('Could not restore the saved run', err);
    clearSave(); G = null; render();
  }
}
