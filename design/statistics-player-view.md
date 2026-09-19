# Statistics layout trial

The statistics page defaults to **Player view**. **Classic view** restores the previous table immediately. The choice is stored locally under `omaha-statistics-layout`; it does not affect other players or server data.

Both views receive the same metrics calculated by `PartyStatistics` in `demo/client/src/pages/App.tsx`. The old JSX and `WalletHistoryChart` remain in place. The new view uses the current metric set, including Missed high, without adding the average shown in the concept image. UI copy has English and Russian variants; the existing app language is English.

To change the default for browsers without a saved preference, set `DEFAULT_STATISTICS_LAYOUT` to `'classic'` in `demo/client/src/components/statisticsLayout.ts`. A saved preference takes precedence.

To remove this trial from the app entirely, remove the `StatisticsPresentation` import and its opening/closing wrapper in `App.tsx`, keeping the child `party-summary` section. Then remove the new `StatisticsPresentation.tsx`, `StatisticsDashboard.tsx`, `FocusedWalletChart.tsx`, `statisticsLayout.ts`, and `statisticsDashboard.css` files. Remove `statistics-player-view.spec.ts` and the Classic view click added to `responsive-statistics.spec.ts`. Keep its updated wait for the New deal button: the old You lost text locator matches both desktop and mobile markup. Do not reset all of `App.tsx`: it contains unrelated changes that predate this trial.

Checks: client typecheck/build and unit tests; Playwright `statistics-player-view.spec.ts`, `responsive-statistics.spec.ts`, and `early-finish.spec.ts`. The new browser coverage compares every rendered player metric with the classic table, exercises selection and chart navigation, checks layout persistence and blocked storage, and checks desktop/mobile widths.

The existing `early-finish.spec.ts` fails before opening statistics because the current table UI has no End table early and calculate results button. This is unrelated to the statistics layout trial.
