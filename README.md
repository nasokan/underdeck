# Underdeck

A roguelike deckbuilder built on the rules of **Scoundrel**, the solo card game by Zach Gage and Kurt Bieg.
Fight through rooms of cards, chain weapon kills for Glory, and spend your loot on relics that bend the rules.
Eight depths, six bosses, one deck.

**Play:** https://nasokan.github.io/underdeck/

## How it plays
- ♠♣ are monsters, ♦ weapons, ♥ potions. Each room deals 4 cards; resolve 3 and the last carries over.
- Fighting with a weapon costs (monster − weapon) HP, and the weapon can then only hit monsters weaker than its last kill.
- **Glory = Valor × Fury.** Fury grows with every kill in your weapon's chain, so falling chains score big.
- **Undead ♠:** face cards rise once at half value. **Beasts ♣:** +1 strength for every other ♣ in the room.
- Hit each floor's Glory target, then leave or press on for gold. Shop between floors.
- Every run has a seed. Share `…/underdeck/#seed-XXXXXX` to send a friend the same dungeon, or play the Daily dungeon.

See [SPEC.md](SPEC.md) for the full design.

## Develop
```bash
npm install
npm run dev      # play locally at http://localhost:5173
npm test         # rules tests
npm run sim      # bot plays 3000 seeded runs for a balance check
npm run build    # production build into dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

Balance knobs live at the top of `src/data.ts` (`BASE_TARGETS`, `GROWTH`).

## Layout
- `src/game.ts` rules, no DOM · `src/data.ts` relics, bosses, bestiary · `src/rng.ts` seeded randomness
- `src/ui.ts` rendering and input · `src/anim.ts` animation helpers · `src/art.ts` woodcut SVG art
- `gallery.html` shows every drawing (dev only)

Scoundrel's rules are used with credit to its designers; this is an unofficial fan project.
