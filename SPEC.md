# Underdeck — prototype spec

A roguelike deckbuilder built on the rules of Scoundrel (a solo card game by Zach Gage and Kurt Bieg),
with a score-chasing meta layer: Glory targets, relics, a shop and boss floors.

## Core rules (Scoundrel variant)
- 52-card dungeon: ♠♣ monsters (2–14), ♦ weapons (2–10), ♥ potions (2–10), six ♦/♥ J/Q/K court allies and two Jokers. Red aces remain excluded.
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

## Court allies and Jokers
- ♦ J/Q/K recruit one ready fighter with power 8/10/12, plus ♦ sigil levels. Recruiting replaces the previous fighter.
- Send a fighter against one monster at or below its effective strength limit: it kills without HP damage, consumes no ward, and then leaves. The weapon and chain are untouched. Ally scoring includes floor Fury, Trophy Rack and applicable sigils/Duelist, but excludes weapon-chain Fury, Bloodletter and Executioner. Undead still Rise.
- ♥ J heals 6 + 2 per ♥ sigil, separately from potions, Blood Price and Leech. ♥ Q grants 5 + 2 per ♥ sigil ward, absorbed before combat HP damage. ♥ K grants +1 Fury this floor.
- Fighters, ward and court Fury expire between floors. Ward does not trigger Executioner if the weapon would otherwise have dealt damage.
- Each Joker can be safely dismissed or invoked. Both resolve the card. Six equally likely seeded outcomes: +4 gold, heal up to 5, +1 floor Fury, lose up to 3 gold, lose up to 3 HP (minimum 1 HP), or reset weapon chain while retaining wear (without a weapon, lose up to 2 gold).
- Joker effects use an isolated seed/floor/card stream, survive save/load, and do not reroll after reload. A face-down Mimic Joker invokes automatically; blind monsters use a usable weapon, then a capable ally, then bare hands.
- Hoarder grants held-gold Glory per completed room, capped at 20. Starter relic stats remain unchanged after paired balance testing. Later targets gain the measured premium described below.

## Run structure
- Begin each new run with a free seeded choice of three relics from Whetstone, Iron Gut, Coward's Cloak, Executioner and Scavenger. It occupies one of the five relic slots; current saves continue without this step.
- 8 Depths × (Hall, Vault, Lair), 24 floors for a substantial run. Lair has one of 6 bosses: Warden, Leech, Rustking, Hollow Crown, Mimic, Swarm.
- Targets start at 35 / 60 / 90 and grow ×1.45 per Depth. After Depth 4, multiply the raw target by an extra ×1.05 for each later Depth, then round once to the nearest 5. The final Lair target is 1475.
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

## November 19, 2026 playtest pass
A full 24-floor browser run reached victory using the ordinary controls, all six bosses and all new card types. See [playtest and balance report](docs/PLAYTEST.md) for the cohort, tuning choices and remaining limitations. Old v1 saves gain the eight new cards in the persistent deck once; the current room and draw stay intact, so cards appear naturally on the next floor.
