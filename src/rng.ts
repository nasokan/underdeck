// Seeded randomness. Every random draw in a run comes from a stream derived from the run seed,
// so a seed reproduces the same dungeon for everyone.

export interface Rng { s: number }

export function hashStr(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A named stream, e.g. mkRng(seed, 'floor', depth, fi). */
export const mkRng = (seed: string, ...parts: (string | number)[]): Rng => ({ s: hashStr([seed, ...parts].join('|')) });

/** mulberry32: mutates the stream state so it survives save/load. */
export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(next(r) * (hi - lo + 1));

export function shuffle<T>(r: Rng, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next(r) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pickN = <T>(r: Rng, a: T[], n: number): T[] => shuffle(r, [...a]).slice(0, n);

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomSeed(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

export function dailySeed(d = new Date()): string {
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
  return `D${y}${m}${day}`;
}

export const SEED_RE = /^[A-Z0-9]{4,12}$/;
export const normalizeSeed = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
