import { describe, expect, it } from 'vitest';
import { Game, newGame } from '../src/game';
import { chooseMove } from '../scripts/playtest-policy';
const clone = (g: Game): Game => JSON.parse(JSON.stringify(g));
describe('visible-information playtest policy', () => {
  it('does not mutate the supplied live run', () => {
    const g = newGame('AUDIT0');
    const before = JSON.stringify(g);
    chooseMove(g);
    expect(JSON.stringify(g)).toBe(before);
  });
  it('makes the same decision with a different unseen draw order', () => {
    const a = newGame('AUDIT0'), b = clone(a);
    b.f.draw.reverse();
    expect(chooseMove(a)).toEqual(chooseMove(b));
  });
  it('makes the same decision when a hidden card has another identity', () => {
    const a = newGame('AUDIT0');
    a.f.room[0].hidden = true;
    const b = clone(a), id = b.f.room[0].c.id;
    b.f.room[0].c = { id, suit: 'H', v: 10 };
    expect(chooseMove(a)).toEqual(chooseMove(b));
  });
  it('does not use the seeded Joker outcome to select an action', () => {
    const a = newGame('AUDIT0');
    a.hp = 15;
    a.f.room = [
      { c: { id: 51, suit: 'J', v: 0 }, hidden: false }, { c: { id: 2, suit: 'C', v: 3 }, hidden: false },
      { c: { id: 33, suit: 'D', v: 9 }, hidden: false }, { c: { id: 34, suit: 'H', v: 5 }, hidden: false },
    ];
    const expected = chooseMove(a);
    for (let i = 0; i < 20; i++) {
      const b = clone(a);
      b.seed = `DIFFERENT${i}`;
      expect(chooseMove(b)).toEqual(expected);
    }
  });
});
