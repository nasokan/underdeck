# Underdeck

A roguelike deckbuilder built on the rules of Scoundrel (solo card game by Zach Gage and Kurt Bieg).
Vite + TypeScript, no framework. Live at https://nasokan.github.io/underdeck/ (repo `nasokan/underdeck`).
Local path: `/Users/nish/code/underdeck`.

Read first: [SPEC.md](SPEC.md) (game design), [DESIGN.md](DESIGN.md) (visual direction).
For a review task, see [docs/REVIEW.md](docs/REVIEW.md).

## Commands
```bash
npm install
npm run dev     # http://localhost:5173
npm test        # vitest rules, UI dispatch, modal policy and save tests
npm run playtest -- 100 --out /tmp/underdeck-playtest # visible-room planning and legal starter cohorts
npm run sim     # greedy bot plays 3000 seeded runs; prints clear rates per Depth
npm run build   # tsc --noEmit + vite build into dist/
```
Pushing to `main` runs tests, builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Code map
| File | Role |
|---|---|
| `src/game.ts` | All rules. Pure: no DOM. Functions mutate a `Game` and return `Ev[]` events for the UI to animate. |
| `src/data.ts` | Relics, bosses, bestiary names/captions, balance knobs (`BASE_TARGETS`, `GROWTH`). |
| `src/rng.ts` | Seeded RNG (mulberry32). Separate named streams: `bosses`, `floor/depth/fi`, `shop/depth/fi`. |
| `src/ui-policy.ts` | Pure screen/modal action guards and native keyboard policy. |
| `src/save.ts` | localStorage autosave (`underdeck-save-v1`) and stats (`underdeck-stats-v1`). |
| `src/ui.ts` | Rendering (HTML strings into `#app`), input, action animations. Module-level state: `G`, `sel`, `picker`, `modal`, `busy`. |
| `src/anim.ts` | Web Animations helpers. Every animation times out, so gameplay never waits on a stalled animation. |
| `src/art.ts` / `src/art.css` | Woodcut SVG art for monsters, weapons, potions, bosses and relic icons. Colors come from CSS classes only (`.ink .paper .acc`…). |
| `src/style.css` | The paper-map look. Tokens on `:root`; see DESIGN.md. |
| `gallery.html` | Dev-only art gallery (`/gallery.html?grid=200&zones` outlines card-corner safe zones). Not in the production build. |
| `prototype/underdeck-v0.html` | The original single-file prototype, kept for history. |

## Conventions
- Rules changes go in `game.ts` with a test in `tests/game.test.ts`. Keep `game.ts` free of DOM.
- All randomness goes through `rng.ts` streams so seeds stay reproducible. Never call `Math.random` in rules.
- Bump the save key if the `Game` shape changes incompatibly (a broken save already falls back to the title screen).
- Art: no hard-coded colors. Keep the card-corner zones empty (top-left x 0–26, y 0–27; badge strip top-right x 70–100, y 0–14 of the 100×100 viewBox).
- Type: Pirata One for names and titles only; Atkinson Hyperlegible for text, buttons and every number.
- UI copy: plain sentences, no em dashes, no all-caps labels.

## Testing aids
- `?still` in the URL turns all animation off. The Claude desktop browser pane freezes animations while hidden, so use it there.
- In dev, `window.__ud.G` is the live game state and `window.__ud.render()` re-renders. Use them to stage rooms, e.g.
  `__ud.G.f.room = [{c:{id:1,suit:'C',v:10},hidden:false}, …]; __ud.render()`.
- `#seed-XXXXXX` in the URL offers that seed on the title screen.

## November 2026 upgrade
- New UI runs call `newGame(seed, daily, true)` and enter `starter`; existing callers default to immediate play. `starterChoices` uses an isolated stream, and `chooseStarter` applies exactly one free relic.
- Preserve 8 depths/24 floors, one difficulty and base HP; tune targets only with paired evidence. No tutorial, sound or visual redesign.
- Keep modal actions guarded by `ui-policy.ts`, background content inert, and focus inside dialogs. Persist rules mutations before visual waits; release busy locks in finally.
- Mobile bar clearance comes from ResizeObserver; do not restore a fixed padding guess.
- Findings, design decisions and research: [docs/UPGRADE.md](docs/UPGRADE.md).

## Court and Joker rules
- `isCourt`/`isJoker` must branch before weapon/potion handling. Honing applies only to `isWeapon`.
- Fighters are one-use floor resources (`f.ally`), heart supports heal/grant ward/add Fury, `killScore.dmg` is HP damage after ward with `blocked` explicit. `allyScore` excludes weapon-chain and Executioner bonuses.
- `migrateGame` upgrades legacy decks once (`rulesVersion: 2`) without altering their current room/draw. `f.ally` and `f.ward` stay optional for v1 compatibility.
- Joker RNG uses isolated seed/floor/card streams. Never let planning inspect its seeded outcome; tests enforce hidden/future/outcome privacy.
- Hoarder caps at `HOARDER_CAP` (20) per completed room. Late targets use LATE_GROWTH=1.05 after Depth 4; starter stats are unchanged. Further tuning needs paired evidence.
- `scripts/playtest-policy.ts` is a deterministic visible-room planner, not a human difficulty forecast. `scripts/playtest.ts` reports legal starter samples, matched comparisons and public-only traces. See docs/PLAYTEST.md.
