# Diagnosis: stale-hide-calibrated-filter

**Finding:** specs/20260705-exercise-calibration/qa-findings.md, finding 2
**Handoff:** `bugfix/stale-hide-calibrated-filter-done`

## Bug Description

On the `/calibrate` exercise list, calibrating an exercise (completing the
calibration flow and saving) and then returning to the list does not
immediately reflect that calibration: the "Calibrated" badge doesn't
appear on the card, and toggling "Hide calibrated" on does not hide the
just-calibrated exercise. The saved result is confirmed correct (reopening
the calibration flow for that exercise shows it pre-filled). Later, after
further unspecified navigation, the badge appears and the filter starts
working correctly for that exercise.

## Hypothesis

`CalibrateList` (`src/app/calibrate/index.tsx`) loads calibration status
into `calibratedIds` exactly once, in a `useEffect` keyed on `exercises`,
a value that never changes after the initial `useState` call. Because
`expo-router`'s root layout is a plain `Stack`, pushing into
`/calibrate/[id]` and calling `router.back()` returns to the *same*
mounted `CalibrateList` instance rather than remounting it, so that
one-time effect never re-runs and `calibratedIds` keeps reflecting
whatever was calibrated before the user entered the list — not what was
just saved. There is no focus listener or other mechanism anywhere in
the calibration screens that re-queries storage on return.

## In-Depth Explanation

1. `CalibrateList` seeds its exercise array once via a lazy `useState`
   initializer:
   ```ts
   const [exercises] = useState<Exercise[]>(() => sortByMuscleCountDesc(loadExercises()));
   ```
   (`src/app/calibrate/index.tsx:92`). There is no setter for `exercises`
   used anywhere else in the file, so this reference is stable for the
   entire lifetime of the component instance.

2. Calibration status is loaded into state by an effect keyed on that
   same stable reference:
   ```ts
   useEffect(() => {
     let cancelled = false;
     async function loadCalibrationStatus() {
       const entries = await Promise.all(
         exercises.map(async (exercise) => [exercise.id, await isCalibrated(exercise.id)] as const)
       );
       if (!cancelled) {
         setCalibratedIds(new Set(entries.filter(([, calibrated]) => calibrated).map(([id]) => id)));
       }
     }
     loadCalibrationStatus();
     return () => { cancelled = true; };
   }, [exercises]);
   ```
   (`src/app/calibrate/index.tsx:127-145`). Since `exercises` never
   changes identity, this effect's dependency array guarantees it fires
   exactly once, on mount — never again for the life of that component
   instance.

3. `calibratedIds` is the *only* input that drives both symptoms in the
   Bug Description: the "Calibrated" badge on `ExerciseCard` is rendered
   purely from the `calibrated` boolean prop passed down —
   ```ts
   {calibrated && (
     <View style={styles.badge}>
       <Text style={styles.badgeText}>Calibrated</Text>
     </View>
   )}
   ```
   (`src/components/ExerciseCard.tsx:32-36`) — and the hide-calibrated
   filter checks the same set directly:
   ```ts
   if (hideCalibrated && calibratedIds.has(exercise.id)) {
     return false;
   }
   ```
   (`src/app/calibrate/index.tsx:158`). Neither reads calibration status
   independently; both are downstream of the one `calibratedIds` state
   value set by the effect in step 2.

4. Saving a calibration writes straight to `AsyncStorage` and does
   nothing to any in-memory list state:
   ```ts
   await saveCalibration({ ... });
   router.back();
   ```
   (`src/app/calibrate/[id].tsx:176-188`), and `saveCalibration` itself
   only touches `AsyncStorage.setItem` (`src/data/calibrationStorage.ts:34-41`)
   — there's no event, callback, or shared store that would notify the
   list screen a save happened.

5. The root layout is an unconfigured `Stack`:
   ```tsx
   export default function RootLayout() {
     return <Stack />;
   }
   ```
   (`src/app/_layout.tsx:1-5`). Under `expo-router`'s (React Navigation's)
   standard stack semantics, pushing a new screen does not unmount the
   screen underneath it — it stays mounted, just unfocused, so its state
   (including `calibratedIds` from step 2) survives the round trip
   unchanged. This step is **inferred** from documented stack-navigator
   behavior, not directly observed by running the app (see Unknowns).

Putting 1-5 together: `router.push('/calibrate/<id>')` from the list does
not unmount `CalibrateList`; saving writes only to `AsyncStorage`; and
`router.back()` returns to the same still-mounted instance whose
one-shot effect already ran before the calibration existed. Nothing in
the code path re-queries `isCalibrated` for the returned-to instance, so
`calibratedIds` — and everything downstream of it — is stale immediately
after the round trip, exactly matching the reported symptom.

What the trace does *not* explain on its own is the reported
self-correction ("at some later point, the badge appeared... and the
filter worked"). The only mechanism in the code that would ever cause
`calibratedIds` to refresh is a **fresh mount** of `CalibrateList` — i.e.
the previous instance being unmounted (popped off the stack entirely,
e.g. by navigating back to `/` and pushing into `/calibrate` again)
rather than merely revisited via push/back. This is consistent with the
report's "continued navigating the app further" framing, but it's
inferred, not confirmed — see Unknowns.

## Evidence

1. **Observed** — `src/app/calibrate/index.tsx:92`
   ```ts
   const [exercises] = useState<Exercise[]>(() => sortByMuscleCountDesc(loadExercises()));
   ```
   No setter for `exercises` appears anywhere else in the file (checked
   via full read of the file) — its identity is stable for the
   component's lifetime.

2. **Observed** — `src/app/calibrate/index.tsx:127-145`
   ```ts
   useEffect(() => {
     let cancelled = false;
     async function loadCalibrationStatus() {
       const entries = await Promise.all(
         exercises.map(async (exercise) => [exercise.id, await isCalibrated(exercise.id)] as const)
       );
       if (!cancelled) {
         setCalibratedIds(new Set(entries.filter(([, calibrated]) => calibrated).map(([id]) => id)));
       }
     }
     loadCalibrationStatus();
     return () => { cancelled = true; };
   }, [exercises]);
   ```
   Dependency array is `[exercises]` only — no dependency on route
   params, focus state, or anything that changes on navigation back into
   this screen.

3. **Observed** — `src/components/ExerciseCard.tsx:32-36`, badge render
   gated solely on the `calibrated` prop.

4. **Observed** — `src/app/calibrate/index.tsx:158`, hide-calibrated
   filter checks `calibratedIds.has(exercise.id)` directly, same state
   value as the badge.

5. **Observed** — `src/app/calibrate/[id].tsx:176-188`
   ```ts
   await saveCalibration({ ... calibratedAt: '' });
   router.back();
   ```
   No call to any list-refresh function, no shared state update, no
   event emission — save and navigation-back are the only two things
   that happen.

6. **Observed** — `src/data/calibrationStorage.ts:34-41`, `saveCalibration`
   only calls `AsyncStorage.setItem`; no in-memory cache or subscriber
   list exists in this file or anywhere else under `src/data/`
   (confirmed via `grep -rn "focus\|useFocusEffect\|isFocused" src/` —
   zero matches).

7. **Observed** — `src/app/_layout.tsx:1-5`, root layout is a bare
   `<Stack />` with no custom `screenOptions` (e.g. no `unmountOnBlur`
   or similar).

8. **Observed** — `git log --oneline -- src/app/calibrate/index.tsx`:
   ```
   554198d task: 10 — equipment filter
   100a823 task: 9 — muscle group filter and target sort
   1b715e3 task: 7 — exercise list search and hide-calibrated toggle
   ad58d81 chore: drop plan.md task-number references from code comments
   2388e59 task: 5 — extract exercise list render into a component
   cf7d3bb task: 4 — exercise list base render and default sort
   ```
   `git show cf7d3bb -- src/app/calibrate/index.tsx` shows the
   `useEffect(..., [exercises])` pattern was introduced in task 4 (the
   list's very first version, before search/hide-calibrated existed) and
   has been carried forward unchanged through tasks 5, 7, 9, and 10 —
   the hide-calibrated toggle (task 7) was built on top of this
   already-load-once effect rather than revisiting it.

9. **Observed** — `npx jest src/app/calibrate` run in the worktree:
   ```
   PASS src/app/calibrate/[id].test.tsx
   PASS src/app/calibrate/index.test.tsx
   Test Suites: 2 passed, 2 total
   Tests:       27 passed, 27 total
   ```
   Full read of `src/app/calibrate/index.test.tsx` confirms no test
   exercises "return to an already-mounted list after a calibration
   completes" — every test calls `renderSettledList()` once per test
   and asserts against that single mount's settled state, so this gap
   was never covered.

10. **Observed** — `grep -n -i "refresh\|focus\|reload\|stale" specs/20260705-exercise-calibration/plan.md BACKLOG.md`:
    no matches. No existing spec/plan/backlog language anticipates or
    scopes out a return-to-list refresh requirement.

11. **Inferred** — React Navigation / `expo-router` stack semantics:
    pushing a new screen does not unmount the screen beneath it; it
    stays mounted and simply loses focus, resuming on `back()` with its
    state intact. Reasoned from the combination of items 6 and 7 (no
    code anywhere forces an unmount/remount or subscribes to focus) plus
    this being `expo-router`'s documented default stack behavior — not
    verified by watching this app's screens actually mount/unmount.

## Unknowns

- **Not confirmed by running the app**: whether `CalibrateList` truly
  stays mounted (rather than unmounting/remounting) across a
  `push`/`back` round trip in this specific app, and whether the
  self-correction the QA report describes is in fact caused by a full
  unmount+remount (e.g. backing out to `/` and re-entering `/calibrate`)
  as Evidence item 11 infers, or by some other trigger not identified
  here. No tooling exists yet to drive the app and observe this live
  (see `BACKLOG.md`'s "bug reproduction flow design" item) — closing
  this gap requires either that tooling or manual observation.
- **Exact navigation sequence for the self-correction** is not tracked
  in the QA report itself ("exact steps not tracked"), so even with
  live-app tooling, reproducing precisely what the original tester did
  may not be possible — only that *some* sequence eventually caused a
  refresh.
- Whether `calibratedIds` becoming stale ever causes an incorrect
  **save** (not just incorrect display) — e.g. whether re-calibrating
  the same exercise from a stale list is affected — was not
  investigated; the report's repro is display/filter-only, and nothing
  in `saveCalibration` (Evidence item 6) reads from `calibratedIds`, so
  this is believed out of scope, not just unchecked.

## Confidence Level

High for the core mechanism: the effect-fires-once-per-mount behavior
(Evidence 1-2) and both symptoms' direct dependence on its output
(Evidence 3-4) are fully observed in code, and the absence of any
refresh trigger is confirmed both by reading every relevant file and by
a repo-wide grep (Evidence 6, 10). This alone fully explains "the filter
didn't apply immediately after calibrating" — the first four repro
steps in Bug Description.

Lower confidence specifically on the *self-correction* half of the
report (repro step 5): that piece rests on Evidence item 11, which is
inferred from general stack-navigator semantics rather than observed
directly in this app. If `expo-router`'s `Stack` in this project were
configured to unmount blurred screens (nothing found suggests it is,
per Evidence 7, but this wasn't verified live), the explanation for the
initial staleness would still hold, but the self-correction account
would need revisiting.

## Validations

**Human validation:** Repeat the original repro — calibrate "Self-Assisted
Inverse Leg Curl" from the `/calibrate` list, save, and return to the
list via the back navigation from the calibration screen (not by
restarting the app or navigating away and back through `/`). Immediately,
without any further navigation: the exercise's card should show the
"Calibrated" badge, and turning "Hide calibrated" on should hide that
exercise right away.

**Suggested tests:**

- In `src/app/calibrate/index.test.tsx`: a test asserting that
  `CalibrateList` reflects a calibration change without being
  unmounted — e.g. render the list, let it settle, then change what the
  mocked `isCalibrated` resolves for a previously-uncalibrated exercise
  and trigger whatever re-check mechanism the fix introduces (e.g.
  re-rendering with a focus event fired, if `useFocusEffect` ends up
  being the fix), and assert the "Calibrated" badge appears and (with
  "Hide calibrated" on) the exercise is hidden — all on the *same*
  rendered instance, never unmounting/remounting it. Suggested
  description: `it('reflects a newly-completed calibration on the
  already-mounted list without remounting', ...)`. This is the test
  that would have caught the reported bug; it needs a fix approach
  decided first to know exactly what to trigger — the coder should
  shape the test around whatever mechanism they add.
- No new test file is needed; this belongs alongside the other
  `CalibrateList` behavior tests already in
  `src/app/calibrate/index.test.tsx`, following that file's existing
  `renderSettledList()` + mocked `@/data/calibrationStorage` pattern.

## Unrelated Findings

None. The investigation stayed on `CalibrateList`'s calibration-status
loading path and its two consumers (badge, hide-calibrated filter); no
other candidate cause was seriously chased.
