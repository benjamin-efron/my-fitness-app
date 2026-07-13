# Plan: Exercise Calibration

Tasks in build order. One task per `coder` invocation. See `spec.md`
for the full behavior and data shape each task is implementing
against.

Each task's handoff line is filled in by the coder, per
`.claude/agents/coder.md` — nothing else gets added here.

## Task 1: Exercise database seed

Add `data/exercises.json` (the static `Exercise[]` list from
`spec.md`) plus a typed loader (`Exercise` type + a function that
returns the parsed list) somewhere under `src/`. Covers only the data
and its type/loader — no UI.

**Acceptance criteria:**
- `data/exercises.json` exists and validates against the `Exercise`
  shape in `spec.md` for every entry (`id`, `name`, `primaryMuscles`,
  `secondaryMuscles`, `equipment`).
- Every `id` is unique.
- A loader function returns the list typed as `Exercise[]`, with a
  unit test covering: it returns a non-empty list, and every entry
  has a non-empty `id` and `name`.

**Depends on:** the seed JSON being supplied directly (per `spec.md`)
— don't start until it's been provided.

**Handoff:** _(coder fills in: review tag)_

## Task 2: Muscle group & equipment option lists

Pure utility functions the list screen's filters (tasks 6-7) will
both need: derive the distinct set of filterable values straight from
the loaded exercise data, not a hand-maintained list.

**Acceptance criteria:**
- `getMuscleGroupOptions(exercises: Exercise[]): string[]` — every
  distinct value appearing across all entries' `primaryMuscles` and
  `secondaryMuscles` combined, deduplicated.
- `getEquipmentOptions(exercises: Exercise[]): string[]` — every
  distinct value appearing across all entries' `equipment`,
  deduplicated.
- Unit tests cover: dedup across primary/secondary for the muscle
  function, dedup across entries for the equipment function, and an
  empty list in returns an empty list out for both.

**Handoff:** _(coder fills in: review tag)_

## Task 3: Calibration storage layer

A small module wrapping AsyncStorage for `CalibrationResult` reads
and writes, per the key scheme and `TimeTaken` union in `spec.md`
(`calibration:<exerciseId>`).

**Acceptance criteria:**
- `saveCalibration(result: CalibrationResult): Promise<void>` — writes
  the JSON blob under `calibration:<exerciseId>`, setting
  `calibratedAt` to the current time.
- `getCalibration(exerciseId: string): Promise<CalibrationResult | null>`
  — returns the stored result, or `null` if none exists.
- `isCalibrated(exerciseId: string): Promise<boolean>` — convenience
  wrapper for the list screen's badge (task 4), avoids every caller
  re-deriving "exists" from `getCalibration`.
- Unit tests (mocking AsyncStorage) cover: save-then-get round-trips
  a result with a `precise` time value; save-then-get round-trips a
  result with an `approximate` time value; get on an uncalibrated id
  returns `null`; a second save overwrites the first (re-calibration
  case from `spec.md`).

**Handoff:** _(coder fills in: review tag)_

## Task 4: Exercise list — base render and default sort

The `/calibrate` screen's core: every exercise from task 1's loader,
rendered as a card per `spec.md`'s list-view layout and the shared
"Muscle group display" styling convention, sorted by the default rule.
No search/filters yet (tasks 5-7).

**Acceptance criteria:**
- Every exercise renders as a card showing name, its full primary
  muscle list and full secondary muscle list (visually distinguished
  per the primary/secondary highlighting convention — more vibrant
  for primary, muted for secondary), and its equipment.
- Cards for calibrated exercises (via task 3's `isCalibrated`) show a
  calibrated indicator; uncalibrated ones don't.
- Default sort order is total muscle count (primary + secondary),
  most first.
- Tapping a card navigates to the calibration route for that
  exercise's id (the route can be a minimal placeholder screen at
  this point — task 8 builds it out).
- Component test (RNTL) covers: all exercises render; a higher
  muscle-count exercise appears before a lower one; a pre-seeded
  calibrated exercise shows the indicator and an unseeded one doesn't.

**Handoff:** _(coder fills in: review tag)_

## Task 5: Exercise list — search and hide-calibrated toggle

Adds the two simplest list controls on top of task 4's render.

**Acceptance criteria:**
- A search input filters the rendered cards to exercises whose name
  matches the typed text (case-insensitive substring match); clearing
  the input restores the full list.
- A "hide calibrated" toggle removes cards for calibrated exercises
  (per task 3's `isCalibrated`) when on, and restores them when off.
- Component test (RNTL) covers: typing a search term narrows the
  list to matching names only; enabling the hide-calibrated toggle
  removes a pre-seeded calibrated exercise from the rendered list.

**Handoff:** _(coder fills in: review tag)_

## Task 6: Exercise list — muscle group filter and target sort

Adds the muscle-group filter from `spec.md`, including its
single-target two-tier sort behavior.

**Acceptance criteria:**
- Filter options come from task 2's `getMuscleGroupOptions`.
- Selecting one or more groups narrows the list to exercises where a
  selected group appears in *either* `primaryMuscles` or
  `secondaryMuscles`.
- With exactly one group selected, sort switches to: exercises where
  that group is a primary muscle first, then exercises where it's
  only a secondary muscle, each tier internally sorted by the task
  4 default (total muscle count, most first).
- A toggle flips which tier (primary-match / secondary-match) comes
  first.
- Selecting a second group while a target sort is active drops back
  to the task 4 default sort, applied to the (now multi-group)
  filtered set.
- Component test (RNTL) covers: filtering to one group excludes
  exercises with no match in either muscle list; with a single group
  selected, a primary-match exercise renders above a secondary-match
  one; flipping the toggle reverses that order; selecting a second
  group reverts to count-based ordering.

**Handoff:** _(coder fills in: review tag)_

## Task 7: Exercise list — equipment filter

Adds the equipment filter from `spec.md`. Transient/derived only — no
persisted equipment inventory (that's out of scope per the spec's
non-goals).

**Acceptance criteria:**
- Filter options come from task 2's `getEquipmentOptions`.
- Selecting one or more equipment types narrows the list to exercises
  whose `equipment` includes at least one selected type.
- Combines with the muscle-group filter and search/hide-calibrated
  controls from tasks 5-6 (all active filters narrow the same list
  together, not mutually exclusive).
- Component test (RNTL) covers: filtering to one equipment type
  excludes exercises that don't require it; an equipment filter and a
  muscle-group filter applied together narrow to the intersection.

**Handoff:** _(coder fills in: review tag)_

## Task 8: Calibration flow — base form

The drill-in screen from `spec.md`: header plus a form covering reps,
weight, effort, notes, and time entered as a precise number (typed
directly — the stopwatch arrives in task 9, the approximate bucket in
task 10). Wires up the placeholder route from task 4.

**Acceptance criteria:**
- Header shows the exercise's name, its named primary and secondary
  muscles (highlighted per the shared convention), and its equipment.
- Form fields: reps completed (integer), weight used (lbs, numeric),
  mental effort (5-point thumbs scale, 1-5, requires an explicit tap —
  no default), notes (optional free text), and time taken as a plain
  numeric seconds input.
- Save is disabled until reps, weight, effort, and time all have
  values; notes stay optional.
- Saving calls task 3's `saveCalibration` with a `precise` time value
  and the entered fields, then navigates back to the list.
- Component test (RNTL) covers: Save is disabled with the form empty;
  filling reps/weight/effort/time enables Save; tapping Save persists
  a `CalibrationResult` (with `time.kind === 'precise'`) retrievable
  via `getCalibration`.

**Handoff:** _(coder fills in: review tag)_

## Task 9: Calibration flow — in-app stopwatch

Adds the stopwatch as an alternate way to fill in the precise time
field from task 8, per `spec.md`.

**Acceptance criteria:**
- A start/stop control runs an elapsed-time display while active.
- Stopping populates the time field from task 8 with the elapsed
  seconds (rounded to a whole second is fine — no frame-level
  precision required).
- The time field remains editable after stopping, so a user can
  correct the stopwatch's value by typing over it.
- Component test (RNTL) covers: starting then stopping the stopwatch
  after a simulated interval populates the time field with a matching
  value; editing the field afterward overrides that value.

**Handoff:** _(coder fills in: review tag)_

## Task 10: Calibration flow — approximate time

Adds the short/moderate/long bucket as an alternative to the precise
time entry from tasks 8-9, per the `TimeTaken` union in `spec.md`.

**Acceptance criteria:**
- A mode control lets the user switch the time field between
  "precise" (task 8/9's numeric entry + stopwatch) and "approximate"
  (a short/moderate/long choice).
- In approximate mode, Save's time requirement is satisfied by
  picking one of the three buckets rather than entering a number.
- Saving in approximate mode calls `saveCalibration` with
  `time: { kind: 'approximate', bucket: ... }` matching the selection.
- Component test (RNTL) covers: switching to approximate mode and
  picking a bucket enables Save without a numeric time entered; the
  persisted `CalibrationResult` has `time.kind === 'approximate'` with
  the selected bucket.

**Handoff:** _(coder fills in: review tag)_

## Task 11: Re-calibration pre-fill

Opening the calibration flow for an exercise that already has a
stored result pre-fills the form with those values instead of
starting blank, per `spec.md`.

**Acceptance criteria:**
- Navigating to the calibration route for an exercise with an
  existing `CalibrationResult` pre-fills reps, weight, effort, and
  notes with the stored values on first render.
- The time field pre-fills in whichever mode the stored result used
  (precise number, or the correct approximate bucket selected).
- Saving from this state overwrites the existing AsyncStorage entry
  (no duplicate/second entry created).
- Component test (RNTL) covers: pre-seed storage with a precise-time
  result for an exercise, render the flow screen for that exercise
  id, assert the form shows the seeded values; repeat for a
  pre-seeded approximate-time result.

**Handoff:** _(coder fills in: review tag)_
