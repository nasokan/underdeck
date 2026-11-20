# Underdeck

A roguelike deckbuilder built on the rules of **Scoundrel**, the solo card game by Zach Gage and Kurt Bieg.
Fight through rooms of cards, chain weapon kills for Glory, and spend your loot on relics that bend the rules.
Eight depths, six bosses, one deck.

**Play:** https://nasokan.github.io/underdeck/

## How it plays
- Choose one of three seeded starter relics for free, then descend 24 floors.
- ♠♣ are monsters, ♦ weapons, ♥ potions. Each room deals 4 cards; resolve 3 and the last carries over.
- Fighting with a weapon costs (monster − weapon) HP, and the weapon can then only hit monsters weaker than its last kill.
- **Glory = Valor × Fury.** Fury grows with every kill in your weapon's chain, so falling chains score big.
- **Undead ♠:** face cards rise once at half value. **Beasts ♣:** +1 strength for every other face-up ♣ in the room.
- ♦ J/Q/K recruit one-use fighters. ♥ J/Q/K heal, grant ward, or add Fury for the floor.
- Two Jokers offer a seeded good/bad bargain, with a safe dismissal option and no direct lethal roll.
- Hit each floor's Glory target, then leave or press on for gold. Shop between floors.
- Every run has a seed. Share `…/underdeck/#seed-XXXXXX` to send a friend the same dungeon, or play the Daily dungeon.

See [SPEC.md](SPEC.md) for the full design.

## Develop
```bash
npm install
npm run dev      # play locally at http://localhost:5173
npm test         # rules, input and save regressions
npm run sim      # bot plays 3000 seeded runs for a balance check
npm run sim -- 500 --starter # same cohort with the first offered starter
npm run playtest -- 100 --out /tmp/underdeck-playtest # visible-room search, legal starter cohorts and public action trace
npm run build    # production build into dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

Balance knobs live at the top of `src/data.ts` (`BASE_TARGETS`, `GROWTH`).

## Layout
- `src/game.ts` rules, no DOM · `src/data.ts` relics, bosses, bestiary · `src/rng.ts` seeded randomness
- `src/ui.ts` rendering and input · `src/anim.ts` animation helpers · `src/art.ts` woodcut SVG art
- `gallery.html` shows every drawing (dev only)

Scoundrel's rules are used with credit to its designers; this is an unofficial fan project.

Motion follows your device preference, with a saved Reduced option. Existing saved runs remain compatible. Read the [upgrade review](docs/UPGRADE.md) for research, decisions and verification.

The dungeon now starts with 52 cards (six red court allies and two Jokers added; red aces excluded). Hoarder is capped at 20 Glory per room; after Depth 4 the target curve gains 5% per Depth. Read the [full-run balance report](docs/PLAYTEST.md).
