import type { Game } from './game';

const SAVE = 'underdeck-save-v1';
const STATS = 'underdeck-stats-v1';

export interface Stats { runs: number; wins: number; best: { depth: number; fi: number; glory: number; seed: string } | null }

function read<T>(key: string): T | null {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable: play on without saving */ }
}

export const loadGame = () => {
  const g = read<Game>(SAVE);
  return g && g.version === 1 && (g.screen !== 'dead' && g.screen !== 'victory') ? g : null;
};
export const saveGame = (G: Game) => write(SAVE, G);
export const clearSave = () => { try { localStorage.removeItem(SAVE); } catch { /* ignore */ } };

export const loadStats = (): Stats => read<Stats>(STATS) ?? { runs: 0, wins: 0, best: null };

/** Record a finished run. Returns true if it set a new best. */
export function recordRun(G: Game): boolean {
  const s = loadStats();
  s.runs++;
  if (G.screen === 'victory') s.wins++;
  const rank = (d: number, fi: number) => d * 3 + fi;
  const b = s.best;
  const better = !b || rank(G.depth, G.fi) > rank(b.depth, b.fi) || (rank(G.depth, G.fi) === rank(b.depth, b.fi) && G.totalGlory > b.glory);
  if (better) s.best = { depth: G.depth, fi: G.fi, glory: G.totalGlory, seed: G.seed };
  write(STATS, s);
  return better;
}
