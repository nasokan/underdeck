// Small animation helpers on top of the Web Animations API. All of them no-op under reduced motion.
export const reduced = () =>
  document.documentElement.dataset.motion === 'off' ||
  (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

export function anim(el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions): Promise<void> {
  if (!el || reduced() || !(el as HTMLElement).animate || document.hidden) return Promise.resolve();
  const a = (el as HTMLElement).animate(frames, { fill: 'none', ...opts });
  const total = Number(opts.duration ?? 0) + Number(opts.delay ?? 0) + 150;
  // Never let gameplay wait on an animation that can't finish (background tab, element removed mid-flight).
  const timeout = new Promise<void>(r => setTimeout(r, total));
  return Promise.race([a.finished.then(() => undefined, () => undefined), timeout]);
}

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, reduced() ? 0 : ms));

function layer() {
  let l = document.getElementById('fx-layer');
  if (!l) { l = document.createElement('div'); l.id = 'fx-layer'; document.body.appendChild(l); }
  return l;
}

/** Floating text that rises from a screen point. */
export function popup(text: string, kind: 'glory' | 'hurt' | 'heal' | 'gold' | 'info', x: number, y: number, delay = 0) {
  const d = document.createElement('div');
  d.className = `pop pop-${kind}`;
  d.textContent = text;
  d.style.left = `${x}px`;
  d.style.top = `${y}px`;
  layer().appendChild(d);
  const dur = reduced() ? 900 : 1300;
  d.animate(
    reduced()
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: 'translate(-50%, 0) scale(.6)' },
          { opacity: 1, transform: 'translate(-50%, -18px) scale(1.15)', offset: 0.18 },
          { opacity: 1, transform: 'translate(-50%, -40px) scale(1)', offset: 0.6 },
          { opacity: 0, transform: 'translate(-50%, -70px) scale(.95)' },
        ],
    { duration: dur, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
  );
  setTimeout(() => d.remove(), dur + delay + 50);
}

/** A diagonal cut across an element. */
export function slash(target: Element, kind: 'blade' | 'fist') {
  const r = target.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = `slash slash-${kind}`;
  Object.assign(s.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px`, width: `${r.width * 1.5}px` });
  layer().appendChild(s);
  const done = anim(s, [
    { transform: 'translate(-50%,-50%) rotate(-38deg) scaleX(0)', opacity: 1 },
    { transform: 'translate(-50%,-50%) rotate(-38deg) scaleX(1)', opacity: 1, offset: 0.45 },
    { transform: 'translate(-50%,-50%) rotate(-38deg) scaleX(1.05)', opacity: 0 },
  ], { duration: 380, easing: 'ease-out' });
  done.then(() => s.remove());
  if (reduced()) s.remove();
  return done;
}

/** Fly a visual copy of `from` to `to`, then remove it. */
export function fly(from: Element, to: Element, duration = 420) {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.classList.add('ghost');
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  layer().appendChild(ghost);
  (from as HTMLElement).style.visibility = 'hidden';
  const sx = b.width / a.width, dx = b.left - a.left, dy = b.top - a.top;
  return anim(ghost, [
    { transform: 'translate(0,0) scale(1) rotate(0)' },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(${(1 + sx) / 2}) rotate(-8deg)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}) rotate(0)` },
  ], { duration, easing: 'cubic-bezier(.4,.1,.3,1)' }).finally(() => ghost.remove());
}

export function shake(el: Element | null, px = 8) {
  return anim(el, [
    { transform: 'translate(0,0)' }, { transform: `translate(${-px}px, ${px / 2}px)` }, { transform: `translate(${px}px, ${-px / 3}px)` },
    { transform: `translate(${-px / 2}px, ${px / 3}px)` }, { transform: 'translate(0,0)' },
  ], { duration: 320, easing: 'ease-out' });
}

export function pulse(el: Element | null, scale = 1.35) {
  return anim(el, [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.35 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
}

/** Count a number up inside an element. */
export function countUp(el: Element | null, from: number, to: number, ms = 650) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(tick);
  };
  el.textContent = String(from);
  requestAnimationFrame(tick);
}

export const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height * 0.35 });
