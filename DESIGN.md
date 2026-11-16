# Underdeck — visual design

## Concept: the delver's map
The game is played on a page from a pen-and-paper dungeon module. The page is aged graph paper.
The current room is drawn on it the way old dungeon maps draw rooms: a heavy inked wall,
cross-hatched rock outside it, a gridded floor inside. Cards are pieces of card stock laid on the map.
Everything else (health, gold, the log, the shop) reads like the margins of a character sheet:
ruled lines, tick boxes and ledger columns, not floating UI panels.

The woodcut art (black ink on bone) already lives in this world, so the interface is built from
the same two materials: paper and ink.

## Palette
| Token | Use |
|---|---|
| `--page` #e9dec4 | the map sheet |
| `--card` #f6efdc | card stock, sheets, the action bar |
| `--ink` #24211c | text, walls, outlines, the art |
| `--ink-soft` #5d5547 | secondary text |
| `--grid` #3e6a8a | the blue lines of the graph paper; also Glory, chain and selection, so "score" reads as the map's own blue |
| `--rubric` #a3281e | red rubrication: harm, HP, bosses, fatal moves, the logo's initial |
| `--ochre` #956813 | gold, and nothing else |

Light only. Red and blue never decorate; each one means something (harm vs. score).

## Type
- **Pirata One**: the dungeon face. Logo, floor and room names, card names, boss names.
  Never for running text, buttons or numbers (its numerals are hard to tell apart).
- **Atkinson Hyperlegible**: everything people read or press, and every number. Built for legibility at small sizes,
  which matters for the card tips and the phone action bar.
- Labels are sentence case in the body face. No tracked all-caps micro-labels.

## Components
- **Room**: a map room with a hatched-rock frame, a 3px ink wall and a graph-paper floor. The door gap at the top is where cards come in.
- **Health**: a row of tick boxes, as on a character sheet. Filled boxes are HP you have; lost HP is struck through in red.
- **Glory**: a ruler. Tick marks every tenth of the target, filled with blue hatching.
- **Buttons**: printed blocks. Square corners, 2px ink border, a hard offset shadow that the button presses into. The primary button is solid ink with paper text. Fatal moves use a red border.
- **Sections**: separated by double rules, like a ledger. There are no rounded panels with borders.
- **Popups**: rubber stamps (Pirata One, boxed, tilted a few degrees), red for harm, blue for Glory, ochre for gold.
- **Modals**: a sheet of card stock on a dimmed map, with no blur and no glow.

## Ruled out
Dark mode with a single bright accent, gradient progress bars, glows, a radial vignette,
emoji or star icons, a uniform corner radius on every block, tracked uppercase labels,
two-tone gradient banners, and em dashes in UI copy.
