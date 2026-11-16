import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type Game } from '../src/game';

const effects = vi.hoisted(() => ({ anim: vi.fn(async () => {}), wait: vi.fn(async () => {}) }));
vi.mock('../src/anim', () => ({
  ...effects, center: () => ({ x: 0, y: 0 }), countUp() {}, fly: async () => {}, popup() {}, pulse: async () => {}, shake: async () => {}, slash: async () => {},
}));

// A small event surface exercises real boot/dispatch/save timing, without pretending
// to emulate layout, focus order or the browser's native default actions.
let stored: Map<string, string>;
let clickHandler: (event: unknown) => void;
let keyHandler: (event: unknown) => void;
let app: ReturnType<typeof fakeApp>;
let debug: { G: Game; render(): void };
function target(action: string, arg?: string) {
  const el = { tagName: 'BUTTON', dataset: { act: action, arg }, disabled: false,
    closest: (selector: string): unknown => selector === '[data-act]' || selector === 'button, a, summary' ? el : null,
    click: () => clickHandler({ target: el }),
  };
  return el;
}
function fakeApp() {
  const card = { classList: { add() {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 140 }) };
  return {
    innerHTML: '', dataset: {}, children: [], style: { setProperty() {} },
    contains: () => false, setAttribute() {},
    querySelector: (selector: string) => selector.startsWith('.room .card[data-id=') ? card : selector === '.detail .btn.primary' ? target('fight') : null,
    querySelectorAll: () => [],
    addEventListener: (name: string, cb: (e: unknown) => void) => { if (name === 'click') clickHandler = cb; },
  };
}
function act(action: string, arg?: string) { clickHandler({ target: target(action, arg) }); }
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

beforeEach(async () => {
  vi.resetModules(); effects.anim.mockReset().mockResolvedValue(undefined); effects.wait.mockReset().mockResolvedValue(undefined);
  stored = new Map(); app = fakeApp();
  const run = newGame('UIREGRESSION');
  run.f.target = 9999;
  run.f.room = [{ c: { id: 100, suit: 'S', v: 4 }, hidden: false }, { c: { id: 101, suit: 'H', v: 2 }, hidden: false }, { c: { id: 102, suit: 'D', v: 8 }, hidden: false }, { c: { id: 103, suit: 'H', v: 3 }, hidden: false }];
  run.f.weapon = { card: { id: 99, suit: 'D', v: 10 }, last: null, chain: 0, kills: 0, trail: [] };
  stored.set('underdeck-save-v1', JSON.stringify(run));
  const win = { scrollTo() {}, addEventListener() {} };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { activeElement: null, documentElement: { dataset: {} }, body: { insertAdjacentHTML() {} }, getElementById: () => app,
    addEventListener: (name: string, cb: (e: unknown) => void) => { if (name === 'keydown') keyHandler = cb; } });
  vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v), removeItem: (k: string) => stored.delete(k) });
  vi.stubGlobal('location', { hash: '#seed-UIREGRESSION', search: '', origin: 'https://example.test', pathname: '/underdeck/' });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const { boot } = await import('../src/ui'); boot();
  debug = (win as unknown as { __ud: typeof debug }).__ud;
});
afterEach(() => vi.unstubAllGlobals());

describe('real action dispatch regressions', () => {
  it('does not replace Enter on a focused Brawl button with Fight', async () => {
    act('sel', '100');
    const event = { key: 'Enter', target: target('brawl'), preventDefault: vi.fn() };
    keyHandler(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(debug.G.f.room.some(s => s.c.id === 100)).toBe(true);
    // The browser's native activation then dispatches the focused Brawl button.
    act('brawl'); await settle();
    expect(debug.G.hp).toBe(16);
    expect(debug.G.f.weapon?.chain).toBe(0);
  });
  it('persists the move while animation is still pending and blocks repeated actions', async () => {
    act('sel', '100');
    let finish!: () => void;
    effects.anim.mockImplementation(() => new Promise<void>(done => { finish = done; }));
    act('fight');
    expect(JSON.parse(stored.get('underdeck-save-v1')!).f.room.some((s: { c: { id: number } }) => s.c.id === 100)).toBe(false);
    expect(debug.G.f.weapon?.chain).toBe(1);
    act('fight'); act('flee');
    keyHandler({ key: 'Escape', target: { tagName: 'BODY' }, preventDefault() {} });
    expect(debug.G.f.weapon?.chain).toBe(1);
    expect(debug.G.f.fleesLeft).toBe(1);
    finish(); await settle();
  });
  it('releases the busy lock after a visual effect fails', async () => {
    act('sel', '100');
    effects.anim.mockRejectedValueOnce(new Error('effect failed'));
    const logging = vi.spyOn(console, 'error').mockImplementation(() => {});
    act('fight'); await settle();
    expect(debug.G.f.weapon?.chain).toBe(1);
    act('sel', '101'); act('drink'); await settle();
    expect(debug.G.f.room.some(s => s.c.id === 101)).toBe(false);
    logging.mockRestore();
  });
});
