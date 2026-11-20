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
    addEventListener() {} });
  vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v), removeItem: (k: string) => stored.delete(k) });
  vi.stubGlobal('location', { hash: '#seed-UIREGRESSION', search: '', origin: 'https://example.test', pathname: '/underdeck/' });
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const { boot } = await import('../src/ui'); boot();
  debug = (win as unknown as { __ud: typeof debug }).__ud;
});
afterEach(() => vi.unstubAllGlobals());

describe('court and Joker UI dispatch', () => {
  it('shows court actions as recruiting and sends a one-use ally without touching the weapon chain', async () => {
    const g = debug.G;
    g.f.room = [{ c: { id: 200, suit: 'D', v: 11 }, hidden: false }, { c: { id: 201, suit: 'C', v: 8 }, hidden: false }, { c: { id: 202, suit: 'H', v: 3 }, hidden: false }, { c: { id: 203, suit: 'D', v: 3 }, hidden: false }];
    g.f.weapon!.chain = 3;
    debug.render(); act('sel', '200');
    expect(app.innerHTML).toContain('Recruit The Sellsword');
    expect(app.innerHTML).not.toContain('Equip ♦11');
    act('recruit'); await settle();
    expect(g.f.ally?.power).toBe(8);
    expect(g.f.weapon?.chain).toBe(3);
    act('sel', '201');
    expect(app.innerHTML).toContain('Send The Sellsword');
    act('ally'); await settle();
    expect(g.hp).toBe(20); expect(g.f.ally).toBeNull(); expect(g.f.weapon?.chain).toBe(3);
    expect(JSON.parse(stored.get('underdeck-save-v1')!).f.ally).toBeNull();
  });
  it('renders support instead of Drink and previews ward absorption', async () => {
    const g = debug.G;
    g.hp = 10; g.relics.push('blood'); g.f.boss = 'leech'; g.bossSeen = true;
    g.f.room = [{ c: { id: 200, suit: 'H', v: 11 }, hidden: false }, { c: { id: 201, suit: 'H', v: 12 }, hidden: false }, { c: { id: 202, suit: 'C', v: 8 }, hidden: false }, { c: { id: 203, suit: 'D', v: 3 }, hidden: false }];
    debug.render(); act('sel', '200');
    expect(app.innerHTML).toContain('Accept healing');
    expect(app.innerHTML).not.toContain('data-act="drink"');
    act('support'); await settle(); expect(g.hp).toBe(16); expect(g.f.potionUsed).toBe(false);
    act('sel', '201'); act('support'); await settle();
    expect(g.f.ward).toBe(5);
    act('sel', '202'); expect(app.innerHTML).toContain('ward blocks 5');
  });
  it('offers all Joker outcomes, dismisses safely and renders a Joker label instead of rank zero', async () => {
    const g = debug.G;
    g.f.room[0] = { c: { id: 200, suit: 'J', v: 0 }, hidden: false };
    debug.render(); act('sel', '200');
    expect(app.innerHTML).toContain('Possible outcomes');
    expect(app.innerHTML).toContain('Barbed joke');
    expect(app.innerHTML).toContain('Jkr');
    expect(app.innerHTML).toContain('aria-label="Joker,');
    expect(app.innerHTML).not.toContain('>0<i>✦');
    const before = { hp: g.hp, gold: g.gold, fury: g.f.bonusFury, chain: g.f.weapon!.chain };
    act('discard'); await settle();
    expect({ hp: g.hp, gold: g.gold, fury: g.f.bonusFury, chain: g.f.weapon!.chain }).toEqual(before);
    expect(g.f.room.some(s => s.c.id === 200)).toBe(false);
  });
  it('makes a safe ally the default instead of a lethal but usable weapon', () => {
    const g = debug.G;
    g.hp = 1;
    g.f.weapon!.card = { id: 99, suit: 'D', v: 2 };
    g.f.ally = { card: { id: 200, suit: 'D', v: 13 }, power: 12 };
    g.f.room[0] = { c: { id: 201, suit: 'S', v: 8 }, hidden: false };
    debug.render(); act('sel', '201');
    expect(app.innerHTML).toMatch(/class="btn primary" data-act="ally"/);
    expect(app.innerHTML).not.toMatch(/class="btn primary fatal" data-act="fight"/);
  });
  it('can invoke a visible Joker through its own action', async () => {
    const g = debug.G;
    g.f.room[0] = { c: { id: 200, suit: 'J', v: 0 }, hidden: false };
    debug.render(); act('sel', '200'); act('invoke'); await settle();
    expect(g.log[0]).toContain('Joker:');
    expect(g.f.room.some(s => s.c.id === 200)).toBe(false);
    expect(g.hp).toBeGreaterThan(0);
  });
});
