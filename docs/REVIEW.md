# Review brief

**Project:** Underdeck, `/Users/nish/code/underdeck` (repo `nasokan/underdeck`, live at https://nasokan.github.io/underdeck/).
**Goal:** a fresh, independent review of the playable prototype before more features go in.
Report findings ranked by severity, with file:line and a concrete failing scenario for each. Don't fix anything
unless asked; propose fixes instead.

Start with [CLAUDE.md](../CLAUDE.md) for commands and the code map, then [SPEC.md](../SPEC.md) and [DESIGN.md](../DESIGN.md).

## Where things stand
- Built in one session: the rules engine, UI, art, the paper-map restyle and the GitHub Pages deploy.
- Verified:
  - 12 rules tests pass.
  - A scripted bot clicked through two full runs to victory with no console errors. It covered all 6 bosses, shop pickers, relic selling, Risen and Pack cards, and the blind Mimic card.
  - Layout checked at desktop width and at 375px.
- **Never verified:** animations playing in real time. They were only checked as paused single frames, because the browser pane was hidden.
- Balance was tuned only with a weak greedy bot (`npm run sim`), which wins about 0.6% of runs. Real players should do far better; how much better is unknown.

## Review areas, in priority order
1. **Rules correctness against SPEC.md** (`src/game.ts`). Edge cases worth checking:
   - **Undead Rise:** risen cards with The Swarm (5-card rooms) or Pack Rat (carry 2); fleeing a room that holds a risen card; a risen card when the draw pile is empty; Hollow Crown halving 15.
   - **Beasts Pack:** strength while the Mimic has a face-down ♣; the weapon's last-kill value using pack strength.
   - **Floor exit:** the "press on" path: bonus room gold, dying after the target, and the dungeon running dry after the target (should auto-leave).
   - **Flee rules:** fleeing when only risen cards remain; flee charges with Coward's Cloak plus The Warden.
   - **Relic interactions:** Glass Blade/Iron Gut max-HP changes when sold; Blood Price vs. potion gold; Hoarder Glory on room completion.
   - **Seeds:** same seed and same choices should give the same run. Check that nothing in rules uses `Math.random`.
2. **UI state bugs** (`src/ui.ts`):
   - The `busy` lock and animation timeouts.
   - Double clicks during animations.
   - Keyboard shortcuts while modals are open.
   - Autosave and Continue after every screen.
   - Shared-seed links when a different save exists.
   - The share/copy fallback.
3. **Animation feel:** actually play it (`npm run dev`, browser visible, no `?still`). Check:
   - Timing of the weapon swing, slash and recoil.
   - Deal-in and the risen-card entrance.
   - Stamp popups and screen shake.
   - Anything janky, too slow, or that blocks input too long.
4. **Mobile:** 375px and smaller.
   - The fixed action bar must not cover content.
   - Card text must stay legible.
   - Tap targets must be at least 44px.
   - The safe-area insets must be respected.
5. **Accessibility:**
   - Contrast of `--ink-soft` and the blue/red text on the paper backgrounds.
   - Focus visibility.
   - Screen-reader labels on cards, the HP boxes and the Glory ruler.
   - Reduced motion.
6. **Design adherence:** compare the UI with DESIGN.md. Flag anything generic or off-plan, such as leftover rounded panels, gradients, all-caps labels or em dashes.
7. **Art** (`src/art.ts`, `/gallery.html?grid=200&zones`):
   - Readability at phone size.
   - Corner zones kept clear.
   - Known weakest drawings: the Ghoul (spindly at 60px), the Manticore (small face on phones) and the Leech (stylised).
8. **Balance:** read `scripts/sim.ts` and `src/data.ts`.
   - Is Pack Rat (resolve 2 per room) too strong?
   - Are early targets (35/60/90, ×1.45 per Depth) too easy or too hard for a human?
   - Does any relic combo break scoring (e.g. Blood Price + Glass Blade + Trophy Rack)?
9. **Build and deploy:** the workflow, the Vite `base: './'`, and that the `__ud` dev hook and the gallery stay out of production.

## Known and accepted
- Light theme only, by design (see DESIGN.md).
- No sound, by choice.
- The deploy log shows a `punycode` deprecation from inside `actions/deploy-pages` and a notice that GitHub's default build machine is moving to Ubuntu 26. Neither needs action.
- Each weapon/potion tier uses one drawing (the dagger is the same at 2–4).

## Output
A ranked list of findings, each with: file:line, what's wrong, how to reproduce, and a suggested fix.
Group anything subjective (feel, art, balance) separately from defects.
