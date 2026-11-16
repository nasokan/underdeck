// Dev page: every drawing at three sizes, on a bone card and on the dark page.
import './art.css';
import { artDefs, monsterArt, weaponArt, potionArt, bossArt, relicIcon, type BossKey, type RelicKey } from './art';

document.body.insertAdjacentHTML('afterbegin', artDefs());
const app = document.getElementById('app')!;

const SPADES = ['Skeleton (2-5)', 'Ghoul (6-9)', 'Wraith (10)', 'Revenant (J)', 'Banshee (Q)', 'Lich (K)', 'Bone King (A)'];
const CLUBS = ['Rat Swarm (2-5)', 'Dire Wolf (6-9)', 'Cave Bear (10)', 'Basilisk (J)', 'Manticore (Q)', 'Wyrm (K)', 'Elder Beast (A)'];
const RANKS = [2, 6, 10, 11, 12, 13, 14];
const BOSSES: BossKey[] = ['warden', 'leech', 'rust', 'crown', 'mimic', 'swarm'];
const RELICS: RelicKey[] = ['whetstone', 'trophy', 'cloak', 'blood', 'packrat', 'duelist', 'exec', 'hoarder', 'irongut', 'scavenger', 'glass', 'bloodletter', 'tooth'];

function row(label: string, art: string, sizes = ['s60', 's100', 's180'], invertOnDark = false): string {
  const cells = sizes.map((s) => `<div class="card ${s}">${art}</div>`).join('') +
    sizes.map((s) => `<div class="dark ${s}${invertOnDark ? ' art-invert' : ''}">${art}</div>`).join('');
  return `<div class="item"><div class="label">${label}</div>${cells}</div>`;
}

// ?grid=120 shows every drawing once at that size, for quick review.
const gridSize = Number(new URLSearchParams(location.search).get('grid')) || 0;
if (gridSize) {
  const all = [
    ...RANKS.map((v) => monsterArt('S', v)), ...RANKS.map((v) => monsterArt('C', v)),
    ...[2, 5, 8, 10].map(weaponArt), ...[2, 5, 8].map(potionArt), ...BOSSES.map(bossArt),
  ];
  const q = new URLSearchParams(location.search);
  const dark = q.has('dark');
  const from = Number(q.get('from')) || 0;
  if (q.has('count')) all.splice(0, from), all.splice(Number(q.get('count')));
  app.innerHTML = `<style>.g .art{width:${gridSize}px;height:${gridSize}px}</style><div class="g" style="display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start">` +
    all.map((a) => `<div class="${dark ? 'dark' : 'card'}">${a}</div>`).join('') +
    RELICS.map((k) => `<div class="${dark ? 'dark' : 'card'}" style="padding:4px">${relicIcon(k).replace('<svg', '<svg style="width:22px;height:22px"')}</div>`).join('') + '</div>';
} else {
let html = '<h2>Undead (spades)</h2>';
RANKS.forEach((v, i) => (html += row(SPADES[i], monsterArt('S', v))));
html += '<h2>Beasts (clubs)</h2>';
RANKS.forEach((v, i) => (html += row(CLUBS[i], monsterArt('C', v))));
html += '<h2>Weapons (diamonds)</h2>';
[[2, 'Dagger (2-4)'], [5, 'Sword (5-7)'], [8, 'Battle axe (8-9)'], [10, 'Greatsword (10)']].forEach(([v, l]) => (html += row(l as string, weaponArt(v as number))));
html += '<h2>Potions (hearts)</h2>';
[[2, 'Vial (2-4)'], [5, 'Flask (5-7)'], [8, 'Cauldron (8-10)']].forEach(([v, l]) => (html += row(l as string, potionArt(v as number))));
html += '<h2>Bosses</h2>';
BOSSES.forEach((k) => (html += row(k, bossArt(k))));
html += '<h2>Relics</h2>';
RELICS.forEach((k) => (html += row(k, relicIcon(k), ['r22', 'r40', 'r96'], true)));
app.innerHTML = html;
}
