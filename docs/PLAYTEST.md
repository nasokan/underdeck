# Underdeck: court cards, Jokers and full-run balance

November 19, 2026. Baseline: commit `336747c`.

## Shipped design

The owner requested floor-limited allies and bounded Joker risks. The dungeon starts with 52 cards: the previous 44 plus ♦/♥ J, Q and K and two Jokers. Red aces remain excluded. Eight depths, 24 floors, the paper-map/woodcut style, silent play and the rules-reference approach are retained.

| Card | Effect |
| --- | --- |
| ♦ J, The Sellsword | Recruit a one-use fighter, power 8 plus ♦ sigils. |
| ♦ Q, The Duel Captain | Recruit a one-use fighter, power 10 plus ♦ sigils. |
| ♦ K, The Oathkeeper | Recruit a one-use fighter, power 12 plus ♦ sigils. |
| ♥ J, The Field Medic | Heal 6 plus 2 per ♥ sigil. Separate from room potions, Blood Price and Leech. |
| ♥ Q, The Wardkeeper | Gain 5 ward plus 2 per ♥ sigil. Combat damage spends ward before HP. |
| ♥ K, The War Chaplain | Gain +1 Fury for the current floor. |
| Joker, two copies | Invoke one of six seeded effects, or dismiss safely. Either resolves the card. |

One fighter can be ready at a time; recruiting replaces it with an explicit warning. Send a fighter against a monster at or below its effective strength for no HP damage. It then leaves. Weapon chain, weapon wear and ward remain untouched. Ally kills score with floor bonuses, sigils and appropriate Duelist/Trophy effects, but not weapon-chain Fury, Bloodletter or Executioner. Rise and Pack still apply. Fighters and ward expire between floors. An ally becomes the primary action when the available weapon would kill the player.

Joker outcomes, one in six each: +4 gold; heal up to 5; +1 floor Fury; lose up to 3 gold; lose up to 3 HP while retaining at least 1 HP; reset weapon chain while keeping its wear (without a weapon, lose up to 2 gold). The UI lists all outcomes before invocation. The result uses an isolated seed/floor/card stream, so reloading does not reroll it. A face-down Mimic Joker invokes automatically, as the blind-card warning explains. Ward does not absorb Joker HP loss.

The six allies and Joker use new native SVG woodcut art. Accessible labels distinguish courts from ordinary weapons/potions, report ward absorption, and expose selection state. The dev gallery includes the new drawings and remains outside production.

## Balance decisions

**Keep all five starter relics and their stats.** Paired offered-seed comparisons do not establish one universal winner. The old greedy bot's sub-1% win rate was a poor mastery estimate; room planning and sensible shop choices matter far more than that result suggested.

**Cap Hoarder at 20 Glory per completed room.** The old uncapped effect converted growing gold reserves into runaway scoring and encouraged the same late relic set. In a matched 150-run cap experiment, 20 preserved nearly the same wins while increasing final-Lair actions from about 22 to 43. This restores a reason to fight after becoming wealthy.

**Add 5% target growth per Depth after Depth 4.** The initial four depths, base HP and normal 1.45 growth remain unchanged. Targets use one rounding step after multiplying the raw target by `1.05 ** max(0, depth - 4)`. The final Lair rises from 1,215 to 1,475 Glory. In the final cohort, Depth 8 Lairs average 17.5 kills, 24.3 rooms and 50 rule actions.

| Depth | Hall target | Vault target | Lair target |
| --- | ---: | ---: | ---: |
| 1 | 35 | 60 | 90 |
| 2 | 50 | 85 | 130 |
| 3 | 75 | 125 | 190 |
| 4 | 105 | 185 | 275 |
| 5 | 160 | 280 | 420 |
| 6 | 245 | 425 | 635 |
| 7 | 375 | 645 | 970 |
| 8 | 575 | 985 | 1475 |

Rejected experiments: adding monster strength in the later depths also increased Valor and slightly improved wins, rather than creating the intended pressure. An 8% late target premium consumed more deck headroom; 5% was the gentler choice. These were staged comparisons, not abandoned code left in the game.

## Cohort method and results

`scripts/playtest-policy.ts` plans sequences inside the visible room, values HP/resources/score, and makes deterministic shop choices. Before planning it masks future draw order and face-down identities; Joker invocation is evaluated from public expected effects rather than its seeded result. Four tests verify no live-state mutation, future-card peeking, hidden-card peeking or seeded-outcome peeking. The planner has shop preferences and approximate utility; it is not an optimal player or a human win-rate forecast.

Seeds AUDIT0 through AUDIT99, taking each of the three legally offered starters: 100 distinct seeds, 300 correlated starter branches. Baseline won 179/300 (59.7%). The final version wins 222/300 (74.0%): 76 damage losses, two score-short losses and no stalls. Both score-short losses are at the final Lair on AUDIT44, six Glory short, with Cloak or Whetstone.

| Starter | Legal offered runs | Baseline wins | Final wins |
| --- | ---: | ---: | ---: |
| Whetstone | 64 | 37 (57.8%) | 44 (68.8%) |
| Iron Gut | 57 | 35 (61.4%) | 44 (77.2%) |
| Coward's Cloak | 57 | 34 (59.6%) | 42 (73.7%) |
| Executioner | 61 | 38 (62.3%) | 46 (75.4%) |
| Scavenger | 61 | 35 (57.4%) | 46 (75.4%) |

The final version clears successive Lairs in 263, 232, 229, 226, 224, 224, 224 and 222 branches. Of the 229 branches that clear Depth 3, 222 finish (96.9%). Established builds therefore remain forgiving for this policy. The tuning adds scoring decisions and duration rather than claiming a solved human difficulty curve. Small, correlated starter samples do not support precise strength rankings.

Reproduce with `npm run playtest -- 100 --out /tmp/underdeck-playtest`. This writes a cohort and a public-only winning action trace. The original greedy `npm run sim` remains available, updated to recognize the new card types.

## Full browser playthrough

Final rules: seed **AUDIT63**, starter **Scavenger**, **475 verified rule actions**, all **24 floors**, all **six bosses**. The run uses all six court types, four ally kills, three Joker invokes, ward, potions, shop upgrades, relic replacement and a mid-run reload. It finishes the last Lair at **1,531 / 1,475 Glory**, with **9,039 total Glory**. No browser errors or public-state mismatches were found.

The browser replay clicks actual cards and buttons. Each move is checked against public card IDs, HP, Glory, gold, room and screen state; expected snapshots redact hidden cards and contain no future deck or RNG state. No development state hook, save injection or DOM mutation was used. Most of the replay uses the player's Reduced motion option for speed; the new Joker and recruitment animations were also exercised with device-default motion. This is an automated browser playthrough, not a 30-minute human usability study.

At 375px and 320px, new card art and controls remain legible with no horizontal overflow. At 320px the expanded Joker reference has a scrollable 294.4px action bar with 295px reserved below the page; visible controls meet 44px height. Browser error inspection and final deployment status are recorded in the release handoff.

## Compatibility and verification

Old v1 saves migrate in memory once: six red courts and two Jokers join the persistent deck with unique IDs, `rulesVersion` becomes 2, and optional ally/ward fields receive defaults. The current room, draw, HP, progress and current floor target are preserved; new cards and targets apply naturally at the next floor. Existing pending starters resume into the expanded deck. Seed replay is reproducible within this rules version; an old seed does not promise the earlier version's 44-card shuffle.

The release passes 69 tests, strict TypeScript and the production build. Tests cover rank effects, sigil scaling, ally restrictions/chain preservation/Rise, ward/fatal previews, independent healing, bounded deterministic Joker effects, migration, late targets, Hoarder's final-room cap, actual UI dispatch and planner privacy. Production excludes the gallery and __ud development hook.
