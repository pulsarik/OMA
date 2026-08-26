# Wireframe layout QA tasks

Источник требований: зафиксированный wireframe раскладки для 8 игроков (`N = 7`).

## P0 — блокирует раскладку

- [ ] Удалить legacy oval/crowded CSS и все absolute `left/top`-позиции игроков.
- [ ] Оставить один чистый DOM-каркас внутри `.poker-table`.
- [ ] Реализовать opponent rows: 1 ряд, затем 2, затем 3; ряды балансируются, короткий нижний ряд центрируется.
- [ ] Зафиксировать opponent zone `150×100`, gap `2px`.
- [ ] Сделать реальные DOM-зоны в порядке: opponents → results → flop → hints/hero → actions.
- [ ] Перенести реальные game results в results zone `200×100`.
- [ ] Перенести реальный board/flop в full-width zone высотой `100px`.
- [ ] Перенести action dock внутрь `.poker-table` в zone `80%×100`.
- [ ] Пересчитать масштаб относительно доступного `.poker-table`, а не `window`.
- [ ] При размере opponent zone меньше `100×70` переключаться на следующий row mode; после 3 рядов показывать `WINDOW TOO SMALL`.

## P1 — содержимое зон

- [ ] Отображать мои карты только внутри `300×200` hero zone.
- [ ] Убрать стек, SB, BB и D из wireframe-режима.
- [ ] Перенести high/low combinations в реальные боковые зоны `200×150`.
- [ ] Вписать карты соперников внутрь собственных `150×100` зон без наследования legacy transforms.

## P2 — тесты

- [ ] Добавить assertions размеров и порядка всех зон.
- [ ] Проверить wide: 7 opponent zones в один ряд.
- [ ] Проверить narrow: `4 + 3`, нижний ряд по центру.
- [ ] Проверить fallback в 3 ряда и `WINDOW TOO SMALL`.
- [ ] Проверить отсутствие пересечений зон и выхода содержимого за границы.
- [ ] Обновить старые тесты, ожидающие oval/arc/block layout.
- [ ] Добавить визуальные screenshots для wide и narrow.

## QA pass 2026-08-24 — подтвержденные дефекты

- [ ] **P0 / Layout source:** заменить текущие CSS-overrides отдельным layout-компонентом; legacy `oval`, `crowded`, `left/top`, `zoom` и `fit-content` все еще могут влиять на стол.
- [ ] **P0 / Container measurement:** считать доступные width/height от игрового стола, а не от `window.innerWidth/innerHeight`.
- [ ] **P0 / Row selection:** для 7 оппонентов подтверждать режимы `7`, `4+3`, `3+2+2`; переходить к следующему режиму только после проверки минимального размера `100×70`.
- [ ] **P0 / Uniform scale:** один коэффициент должен применяться ко всем зонам, gap и содержимому; scale может быть меньше или больше 1.
- [ ] **P1 / Opponent content:** карты соперников не должны иметь отдельный независимый `zoom`; они должны масштабироваться вместе с зоной.
- [ ] **P1 / Visual zones:** проверить, что при 8 игроках видны все 7 отдельных зон соперников, а не только компактные группы карт.
- [ ] **P2 / Browser QA:** добавить проверки размеров зон, режима рядов, scale `<1`, `=1`, `>1`, и скриншоты wide/narrow.

## Full browser regression — 2026-08-24

Command: `npm.cmd --prefix demo run e2e -- playwright/tests/player-game.spec.ts --reporter=list`

Result: **2 passed, 7 failed**.

New defects from the run:

- [ ] **P0 / Actions unavailable:** `.action-dock` is hidden inside the new actions zone; `Call`, `Check`, `Fold` and bet controls must remain visible and interactive in their placeholder.
- [ ] **P0 / Game-flow regression:** betting/showdown tests cannot find `Call` or `Fold`; restore the action controls without restoring old table positioning.
- [ ] **P1 / Compact height:** compact desktop table measured `662px`, while the existing requirement expects at least `700px`.
- [ ] **P1 / Player metadata:** `player-name-P1/P2` and score elements are absent because the new wireframe mode hides the seat metadata; retain only the metadata required by game behavior, placed inside its zone.
- [ ] **P1 / Action visibility during long hands:** ten-player and eight-player scenarios cannot see action buttons, so board/showdown progression stops.
- [ ] **P2 / Regression tests:** update old selectors/assertions to the new zone DOM only after the action controls and required metadata are restored.
- [ ] **P0 / Confirmed by viewport test:** at `900px` the real DOM still renders all 7 opponent zones in one row; it must switch to `4+3` and center the shorter lower row.
- [ ] **P0 / Confirmed by viewport test:** at `700px` the real DOM must switch to `3+2+2`; if the scaled zone would be below `100×70`, render the explicit too-small state.
- [ ] **P1 / Test coverage:** the new viewport test must remain green for scale-up, scale-down, and all three row modes.
- [ ] **P0 / Confirmed by showdown screenshot:** `.is-showdown` legacy rules spread opponent zones across the table, shrink their cards, and move the results popup over the flop; showdown must use the same zone grid and scale as the active hand.
