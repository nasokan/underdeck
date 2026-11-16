# Underdeck review and upgrade

Reviewed baseline commit `7bf1ba0` on November 15, 2026. Changes were implemented after the owner confirmed the design brief.

## Intent agreed in the design interview

Approachable tactics with deep mastery. Keep the substantial eight-depth, 24-floor run, a single difficulty, current Glory targets and base HP. Preserve paper-map/woodcut art, dark humor, light theme and silence. Use a rules reference, without a tutorial. Start each new run with a free seeded choice of three relics from Whetstone, Iron Gut, Coward's Cloak, Executioner and Scavenger. Each occupies a normal relic slot. More complex relics remain shop discoveries. Preserve existing saves.

## Ranked findings and resolutions

Locations below refer to the reviewed baseline commit, before changes shifted line numbers.

| Severity | Location | Failure and reproduction | Implemented correction |
| --- | --- | --- | --- |
| P1 | `src/game.ts:243` | Final-room completion skipped Hoarder Glory. With 30/35 Glory, 5 gold, Hoarder, one potion and no remaining draw, resolving the potion killed a run that should clear. Final post-target room gold was also omitted. | Apply completion rewards before branching between another room and dungeon exhaustion; recheck target. Regression tests cover both cases. |
| P2 | `src/ui.ts:285` | Open a shop card picker, navigate behind it to Descend and activate it. Shop becomes null while picker remains, causing a render crash. | Central screen/overlay action policy, inert background, dialog focus/trapping/return and transient state reset. |
| P2 | `src/ui.ts:545` | Select a monster, focus Brawl, press Enter. The global shortcut triggered Fight instead. | Native controls retain Enter/Space; page shortcuts only dispatch when appropriate. Actual dispatch regression plus browser Brawl check. |
| P2 | `src/ui.ts:309` | Selecting a card replaced the focused element and lost keyboard position. | Restore focus by control identity; return focus to the room after a resolved control disappears. |
| P2 | `src/ui.ts:354` | Rules changed before animation but autosave happened afterward. Reload during animation restored the earlier state. | Persist immediately after mutation; busy locks release in finally, even after an effect failure. |
| P2 | `src/style.css:7` | Small blue/gold text had insufficient nominal contrast: blue/page 4.32:1, gold/page 3.68:1. | Darken blue to #315a78 and gold to #79500c; preserve their meaning in the map palette. |
| P2 | `src/style.css:46` | Several link and small-button hit boxes were below the brief's 44px minimum. | Enlarge control boxes while retaining printed/ledger styling. |
| P2 | `src/style.css:345` | Fixed 150px phone clearance could be smaller than wrapped action controls. | Measure actual bar height with ResizeObserver, reserve matching page space, cap/scroll the bar on short viewports. |
| P3 | `src/ui.ts:57` | Card accessible labels omitted modified traits and selection state. | Named suits, risen/gilded/serrated/Pack labels and pressed states. |
| P3 | `src/ui.ts:399` | Healing used undefined --moss highlights. | Use a brief paper-brightening and pulse, without introducing a glow palette. |

## Design upgrades

- Three isolated-seed starter offers provide a build decision before the first Hall. Selection is saved, free, validated once and applies HP/flee effects immediately. Existing v1 play/shop/cleared saves bypass this new step.
- The eight-stop route and current floor of 24 make the long arc visible.
- Narrow phones use two card columns, larger art and text, with family traits visible in the action bar. Fatal actions stay labelled.
- Rules explain face-up Pack strength, effective-strength weapon wear, relic exceptions, target risk and seed replay requirements. Already-risen cards say that their next kill is final.
- Motion follows the device by default. The saved Reduced option disables idle movement and shortens visual waits; the OS preference is always respected. `?still` remains an explicit preview override.
- Clipboard failure presents a selectable full seed link. A seed link replays the dungeon from the start; matching starter and subsequent choices are needed for the same run.

## Research and rationale

- [Scoundrel, Zach Gage and Kurt Bieg, original rules](https://stfj.net/art/2011/Scoundrel.pdf): original designer attribution and rules reference. The PDF search result was available but the full document timed out; detailed correctness was checked against this repository's SPEC.md, rather than claiming full external rules verification.
- [Mega Crit's GDC session: Metrics Driven Design and Balance](https://www.gdcvault.com/play/1025731/contactUs): the session overview describes using both metrics and community feedback while preserving game feel. We use simulation as a narrow regression signal, not a human win-rate estimate. The full talk was not reviewed.
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/): readable text, large controls, contextual rules/objectives, reduced background movement and saved settings informed the interface pass. The owner explicitly selected a rules reference rather than the suggested tutorial.
- [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [MDN inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert): background isolation, contained focus, Escape and focus return guided the modal correction.
- [Matt Pocock's grilling skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md): rounds of dependent design decisions produced the confirmed brief above. No skill was installed into the user's global configuration.

## Validation

The baseline passed 12 rules tests and built. The upgrade passes 43 tests across rules, starter selection, edge cases, save/motion settings, action policy and actual UI event dispatch. TypeScript and the Vite production build pass. Production has no gallery or __ud development hook.

Rules coverage includes Rise with Swarm/Pack Rat and empty draw, Hollow Crown 15 to 7, hidden Pack exclusion, strength stored for weapon wear, post-target death, Warden/Cloak, Blood Price potion behavior, relic HP sales, final-room rewards, starter validation and independent seed streams. UI tests cover native Enter, save-before-animation, repeat-input blocking and recovery from rejected animation. They do not emulate a full browser.

Matched deterministic greedy-bot cohort (500 SIM seeds):

| Outcome | Without starter | First offered starter |
| --- | ---: | ---: |
| First Hall cleared | 63.2% | 69.2% |
| First Lair cleared | 19.0% | 22.0% |
| Full victory | 0.8% | 1.0% |

No dungeon-exhaustion deaths in this cohort. Commands: `node --import tsx scripts/sim.ts 500` and the same with `--starter`. The bot plays poorly and buys in stock order. Five victories versus four do not establish a robust full-run difficulty improvement or relic balance. Human session duration and long-run balance remain unmeasured; the requested long structure is preserved, without promising a measured completion time.

Browser verification used the local app with real animations (no `?still`): fixed seed VA73RY, starter reload/selection, equipment, weapon combat and Rise, native Enter on Brawl (11 damage rather than the weapon's 2), target unlock and exit, shop Honing picker and purchase, next-floor progression, modal Tab trapping/Escape/focus return, and motion preference surviving reload. At 375px and 320px, no horizontal overflow was measured; visible controls met the 44px height check. At 320px the selected bar was about 239.5px with 240px reserved, rather than the former 150px guess. Console-error inspection returned none. Keyboard focus returned to a remaining room card after resolving an action.

Visual review covered desktop starter offers and phone combat. It was a focused playthrough through the first shop and next floor, not a 24-floor human playtest. Every boss still needs broader human feel/balance testing; rules regressions cover their relevant interactions. CI and the deployed page are verified separately in the release handoff.
