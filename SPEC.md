# Underdeck — prototype spec

A roguelike deckbuilder built on the rules of Scoundrel (a solo card game by Zach Gage and Kurt Bieg),
with a score-chasing meta layer: Glory targets, relics, a shop and boss floors.

## Core rules (unchanged from Scoundrel)
- 44-card dungeon: ♠♣ monsters (2–14), ♦ weapons (2–10), ♥ potions (2–10).
- Rooms of 4 cards. Resolve 3, the 4th carries into the next room.
- Flee an untouched room (cards to the bottom), never twice in a row. 1 flee per floor by default.
- Weapon fights: take (monster − weapon) damage. After a kill the weapon only hits monsters below its last kill.
- Only the first potion per room heals. Extras sell for 2 gold.

## Scoring
- **Glory per kill = Valor × Fury.**
- Valor = monster's effective value + suit sigil bonus.
- Fury = 1 + weapon chain (+ relic/potion bonuses). Brawling (bare hands) scores ×1, takes full damage, keeps the chain.

## Monster families
| | ♠ Undead | ♣ Beasts |
|---|---|---|
| 2–5 | Skeleton | Rat Swarm |
| 6–9 | Ghoul | Dire Wolf |
| 10 | Wraith | Cave Bear |
| J | Revenant | Basilisk |
| Q | Banshee | Manticore |
| K | Lich | Wyrm |
| A | Bone King | The Elder Beast |

- **Undead: Rise.** A face-card Undead (J/Q/K/A) rises once when killed. The risen card has half its value
  (rounded down), is dealt first into the next room, and cannot rise again. It scores and chains like any monster.
- **Beasts: Pack.** A Beast gets +1 strength for each *other face-up* ♣ in the room. Strength drives damage,
  Valor and the weapon's last-kill value.

## Run structure
- Begin each new run with a free seeded choice of three relics from Whetstone, Iron Gut, Coward's Cloak, Executioner and Scavenger. It occupies one of the five relic slots; current saves continue without this step.
- 8 Depths × (Hall, Vault, Lair), 24 floors for a substantial run. Lair has one of 6 bosses: Warden, Leech, Rustking, Hollow Crown, Mimic, Swarm.
- Targets start at 35 / 60 / 90 and grow ×1.45 per Depth (retuned after adding the traits).
- HP carries through a Depth: heal half your missing HP between floors, full after the Lair.
- **Reaching the target unlocks "Leave the floor".** You may press on: each room completed after that pays +1 gold.
  Dying after the target still ends the run. If the dungeon runs dry after the target, you leave automatically.
- Shop between floors: 13 relics (5 slots, sell for half), sigils, scrolls (Purge, Gild, Hone), card crates, rerolls.

## Seeds
- Every run has a 6-character seed shown on screen. `#seed-XXXXXX` in the URL starts that run.
- "Daily dungeon" uses a seed derived from today's date (UTC).
- Dungeon shuffles, bosses and shop stock and starter offers come from separate seeded streams so friends making the same choices see the same run.

## Presentation
- Woodcut / ink art: black ink on bone cards, carved highlights, cross-hatching, one blood-red accent.
- Drawings: 14 monsters, 4 weapon tiers (dagger 2–4, sword 5–7, axe 8–9, greatsword 10),
  3 potion tiers (vial 2–4, flask 5–7, cauldron 8–10), 6 boss portraits, 13 relic icons.
- Tone: darkly funny captions on grim art.
- Animation: deal and flip, idle breathing, weapon swing + monster recoil on a kill, screen shake on big hits,
  Glory count-up, chain multiplier pulse, risen-undead effect. Respects reduced motion and a saved in-game motion preference.
- No sound.
- Mobile-first: thumb-sized cards, tap to select, actions in a bottom bar. Keyboard shortcuts on desktop.
- Autosave after every move, Continue on the title screen, best-run stats.

## Tech
- Vite + TypeScript, no framework. Rules in `src/game.ts` are separate from rendering.
- Vitest tests for rules, input dispatch, modal policy and saving. `npm run sim` runs a bot for balance checks.
- GitHub Actions deploys to GitHub Pages on every push to `main`.

## Upgrade decisions (November 15, 2026)
- Approachable tactics with deep mastery; preserve long runs, one difficulty, original targets and base HP.
- Rules reference only, without a tutorial. Keep the woodcut/map identity, dark humor, light theme and silent play.
- Explicit eight-depth progress route. Two-column cards on narrow phones, measured action-bar clearance, accessible dialogs and native keyboard activation.
- See [review and research](docs/UPGRADE.md) for findings, evidence and validation limits.
