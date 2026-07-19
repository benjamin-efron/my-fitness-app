# Engineering log: 20260705-exercise-calibration

Cumulative, append-only record of technical decisions, conventions,
debt, and judgment calls surfaced while building this feature — not a
per-task acceptance record (see plan.md and .claude/review/ for that).
Written by the coder and reviewer after finishing each task, without
reading prior entries first, so a point landing multiple times is
signal, not duplication to prune. Read by the human; never edited by
an agent except to append a new entry.

## Task bugfix/stale-hide-calibrated-filter — coder (convention)
Fixed stale hide-calibrated filter by switching CalibrateList's calibration-status load from a mount-only useEffect to expo-router's useFocusEffect

Any future screen that stays mounted across a push/back round trip (expo-router's Stack doesn't unmount screens beneath a pushed one) and needs to reflect AsyncStorage writes made by the pushed screen should reach for useFocusEffect the same way, not a mount-only useEffect — this bug class isn't unique to the calibration list. Testing it required mocking expo-router's useFocusEffect (jest.mock('expo-router', ...) previously only stubbed router.push) to expose a manually-triggerable refocus callback, since jsdom has no real navigation focus/blur events to dispatch; that mock pattern is reusable for any other screen that adopts useFocusEffect.

## Task bugfix/stale-hide-calibrated-filter — reviewer (convention)
Confirmed useFocusEffect (not useEffect) is now the required pattern for any screen under this app's plain Stack layout that must reflect state changed by a screen pushed on top of it.

Verified against expo-router's actual useFocusEffect implementation: it fires on initial focus and on every subsequent 'focus' navigation event (e.g. router.back() into an already-mounted screen), with blur-triggered cleanup — a plain mount-only useEffect never re-runs on that return trip since the root layout never unmounts the popped-back-to screen. This bug fix is the first place that pattern got applied; no other screen in the app currently uses it. Program Builder, Workout Tracker, and History Viewer will all sit under the same bare Stack and are equally exposed to this class of staleness if any of them later read state that a pushed child screen can mutate (e.g. program edits, session saves) — worth checking each against this pattern as those sections get built, rather than rediscovering the same bug independently. The test-side counterpart (a jest.mock('expo-router', ...) factory exposing a captured mockRunFocusEffect() to simulate refocus on an already-mounted RNTL instance, in src/app/calibrate/index.test.tsx) is also a reusable pattern for testing any future screen built the same way.
