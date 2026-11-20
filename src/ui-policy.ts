import type { Screen } from './game';

export type Overlay = 'picker' | 'deck' | 'boss' | null;

/** One dispatch boundary for clicks, keyboard activation and screen transitions. */
export function actionAllowed(screen: Screen | 'title', overlay: Overlay, action: string, busy: boolean): boolean {
  if (busy) return false;
  if (overlay === 'picker') return action === 'pick' || action === 'cancelpick';
  if (overlay === 'deck') return action === 'closemodal';
  if (overlay === 'boss') return action === 'facboss';
  const allowed: Record<Screen | 'title', readonly string[]> = {
    title: ['continue', 'newrun', 'daily', 'seedrun'],
    starter: ['starter', 'deck', 'share', 'quit'],
    play: ['sel', 'desel', 'fight', 'brawl', 'ally', 'recruit', 'support', 'invoke', 'discard', 'equip', 'drink', 'flee', 'leave', 'deck', 'share', 'quit'],
    cleared: ['shop'],
    shop: ['buyr', 'buyg', 'sell', 'reroll', 'leaveshop', 'deck'],
    dead: ['newrun', 'seedrun', 'share'],
    victory: ['newrun', 'seedrun', 'share'],
  };
  return allowed[screen].includes(action);
}

/** Native controls keep their own Enter/Space behavior; shortcuts apply to the page. */
export function ownsKeyboardInput(tagName: string, contentEditable = false): boolean {
  return contentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(tagName.toUpperCase());
}
