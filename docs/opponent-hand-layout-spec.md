# Opponent hand layout specification

## Purpose

The dashed opponent frame is the complete hand zone. It contains the player's
name, action/status, all four hole cards, and any result label. No content may
leave the frame. Different opponent zones may not overlap.

## Zone anatomy

Each opponent zone has fixed semantic slots:

- the four cards are centered on the zone's horizontal axis;
- the player name and score are placed in the upper-left corner;
- the upper-right slot is reserved for the current status/turn indicator;
- HIGH and LOW winner labels use the same upper-right slot;
- the name/status slot has reserved vertical space above the cards; its labels
  must never overlap the card row;
- while the hand is still in a betting street, the lower reserved slot shows
  the latest betting action (`CALL`, `CHECK`, `BET`, `RAISE`, or `FOLD`, with
  its amount when available) instead of a combination;
- the evaluated combination is centered directly below the card row;
- D and SB/BB stay attached to the lower-right edge of the card row, beside
  the last card.
- OUT is centered directly over the card row when a player is eliminated.

The slots must not compete for the same space or cause the card row to move.

## Opponent arc

Opponent zones follow the table's oval seating geometry. The outer zones are
lower than the center zones, and the same coordinates are used before and
after showdown. The zone width is derived from the available horizontal space
and the number of opponents; no content may cross into a neighboring zone.

`slot width = available opponents-row width / (total players - 1)`

The slot is the width available to one opponent hand. The visual positions may
follow the oval arc, but their horizontal allocation remains deterministic.
The zone coordinates and the card row coordinates are identical before and
after showdown.

## Closed and revealed cards

Closed and revealed cards use the same hand layout. Revealing cards changes only
the card face and replaces the latest betting-action label with the high/low
combination block below the cards. It must not move or resize the hand zone, the
name/action row, or the card row.

## Hero/player hand

The player's own hand uses the same top-line anatomy as an opponent hand:

- the player name and score remain on the left of the name row;
- `HIGH` and `LOW` winner labels are placed in the upper-right part of that
  same row, beside the name and before any `D`/`SB`/`BB` position markers;
- the winner labels must not be centered above the cards or rendered in the
  combination slot below them;
- moving the labels into the name row must not move or resize the card row.

## Card mode

`OPPONENT_HAND_ROW_MIN_WIDTH = 220px` is the mode threshold.

- If a slot is at least 220px wide, the four cards are a straight horizontal
  row with readable scale and no overlap.
- If a slot is narrower than 220px, the cards remain in one horizontal row,
  are scaled to fit, and may overlap by at most 40% of one card width.
- Cards never wrap into 3+1 or any other second row.
- Card scale and overlap are calculated from the slot width. The visible card
  line must remain inside the dashed zone.

## Active-player indicator

An active opponent is indicated by a yellow outline around the name badge. The
reserved lower slot uses the latest betting action during betting; those action
words must not be duplicated in the upper-right status slot. Active turns use
the name highlight only; `THINKING` and `YOUR TURN` labels are not rendered.
These indicators must not change
the card coordinates, frame size, or slot size.

## Responsive behavior

The same rules apply on desktop and mobile. Only the slot width changes. A
viewport resize may switch between straight-row and compact-overlap mode, but it must not
change the number of zones, create zone intersections, or move the board.

## Required automated checks

1. For 2–9 opponents, zones have equal slot widths within a 2px tolerance.
2. All name/status/card/result content is contained by its zone.
3. Opponent zone tops follow the same outer-lower/center-higher arc before and
   after showdown.
4. Wide mode has four cards in one straight row with no overlap.
5. Narrow mode has four cards in one straight row; any adjacent overlap is at
   most 40% of a card width.
6. No two zones overlap at any tested viewport.
7. The active-player indicator leaves card coordinates and zone geometry unchanged.
8. Closed-to-revealed transition keeps every opponent zone and card row at the
   same coordinates; only the card face and result block change.
9. Showdown keeps the board center stable.
10. The showdown phase explicitly verifies that revealed cards stay centered
    inside each zone, D and SB/BB labels sit at the lower-right edge beside the
    last card, and high/low result text stays readable without per-character
    wrapping or leaving its zone.
11. Zone anatomy is preserved: name left/top, status or HIGH/LOW right/top,
    the latest betting action during betting or the combination centered below
    the cards after showdown, and OUT centered over the cards.
12. The vertical name/status slot remains separated from the card row in both
    the closed-hand and showdown phases.
13. During betting an opponent's latest `CALL`/`CHECK`/`BET`/`RAISE`/`FOLD`
    action is shown in the reserved combination slot; after showdown that
    action label disappears and the evaluated combination appears there.
14. A betting action word appears only in the reserved lower slot, never twice
    in the opponent zone; the opponent name remains at least 11px on desktop.

## Mandatory visual QA protocol

Automated DOM existence checks are not sufficient. A test is not considered
passed until both geometry assertions and rendered screenshots have been
checked.

For every visual change, test these viewport widths:

- 1558px desktop;
- 1280px desktop;
- 1024px tablet;
- 768px tablet;
- 390px mobile;
- 360px mobile.

Test tables with 2, 4, 6, and 9 opponents, and test preflop, flop, river,
showdown, folded, and active-player states.

For each scenario, automated checks must verify:

1. Every card has a visible non-zero bounding box and the four cards are
   visually distinguishable; cards must not be completely coincident.
2. Card `left`, `top`, `width`, and `height` values satisfy the row and
   overlap rules, including the 40% narrow-mode limit.
3. Name, stack, action/status, cards, and combination are fully contained by
   the dashed hand zone.
4. Hand zones, cards, combinations, board, and result panels do not overlap
   unrelated zones or controls.
5. Closed and revealed states have identical zone and card coordinates within
   a 2px tolerance; only the card face and combination content may change.
6. The active-player name highlight does not change card or zone geometry, and
   no `THINKING` or `YOUR TURN` status label is rendered.
7. The result panel and board remain stable during responsive resizing.
8. During showdown, verify the revealed-card row, D/SB/BB label placement,
   and high/low result text as one combined layout: the label must remain
   beside the last card and result text must not collapse into a vertical
   strip.
9. In an eliminated-player state, verify that OUT is centered over the card
   row and does not use the zone or name position as its anchor.
10. Verify that every name/status label has a visible vertical gap from the
    first card; this must remain true after showdown reveal.

After the automated checks, capture and inspect screenshots at desktop and
mobile sizes. The inspection must explicitly look for clipped text, invisible
or fully overlapped cards, unexpected wrapping, empty space caused by bad
positioning, zone collisions, and result-panel jumps.

Do not report a pass when screenshots have not been inspected or when any
viewport/state combination is untested. Record the tested viewports, states,
screenshots, detected defects, fixes, and remaining failures in the test
report.
