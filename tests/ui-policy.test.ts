import { describe, expect, it } from 'vitest';
import { actionAllowed, ownsKeyboardInput } from '../src/ui-policy';

describe('input boundary regressions', () => {
  it('blocks background shop actions while a card picker is open', () => {
    for (const action of ['leaveshop', 'reroll', 'buyg', 'buyr', 'deck']) expect(actionAllowed('shop', 'picker', action, false)).toBe(false);
    expect(actionAllowed('shop', 'picker', 'pick', false)).toBe(true);
    expect(actionAllowed('shop', 'picker', 'cancelpick', false)).toBe(true);
  });
  it('blocks room actions behind deck and boss dialogs', () => {
    for (const modal of ['deck', 'boss'] as const) for (const action of ['fight', 'flee', 'sel', 'leave', 'quit']) expect(actionAllowed('play', modal, action, false)).toBe(false);
    expect(actionAllowed('play', 'deck', 'closemodal', false)).toBe(true);
    expect(actionAllowed('play', 'boss', 'facboss', false)).toBe(true);
  });
  it('rejects stale controls after transitions and repeated starter choices', () => {
    expect(actionAllowed('play', null, 'starter', false)).toBe(false);
    expect(actionAllowed('play', null, 'leaveshop', false)).toBe(false);
    expect(actionAllowed('cleared', null, 'fight', false)).toBe(false);
    expect(actionAllowed('starter', null, 'starter', false)).toBe(true);
  });
  it('blocks all actions during an unresolved animation', () => {
    for (const action of ['fight', 'flee', 'leave', 'quit', 'desel']) expect(actionAllowed('play', null, action, true)).toBe(false);
  });
  it('leaves native button and disclosure activation to the browser', () => {
    for (const tag of ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']) expect(ownsKeyboardInput(tag)).toBe(true);
    expect(ownsKeyboardInput('DIV', true)).toBe(true);
    expect(ownsKeyboardInput('BODY')).toBe(false);
  });
});
