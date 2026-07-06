# Spec: Exercise Calibration

Status: **ready for planning** — open questions resolved; `plan.md`
for this feature has not been written yet (see `BACKLOG.md`).

## Summary

The workout program measures every working set by reps-in-reserve
(RIR), and every working set targets the same 3–6 RIR band. Calibration
is how the user finds out what that band actually feels like on a
given exercise, and whether the exercise is worth programming at all.

A calibration is a single set taken **to failure** (0 RIR) at a
reasonable, self-selected weight. From that one set the user records:

- how many reps they actually got to failure, at that weight,
- how mentally hard that set felt, and
- how long the failure set took to perform.

The program is built around the highest-value exercises: the ones
that are the most tolerable (lowest perceived effort), take the least
time, and work the most muscle groups. Calibration is what supplies
the raw effort/time/muscle-group data that later lets the (future)
Program Builder rank exercises against each other and pick a sensible
starting point on each one — it is not itself that ranking or
selection step, just the data-capture flow that makes it possible.

## User-facing behavior

### 1. Exercise list (`/calibrate`)

- Shows every exercise in the exercise database (`data/exercises.json`)
  as a list. Each row shows:
  - name
  - number of muscle groups worked (primary + secondary combined
    count)
  - equipment required
  - whether it's been calibrated yet (e.g. a checkmark/badge)
- A **search bar** filters the list by exercise name as the user
  types.
- A **hide calibrated** toggle removes already-calibrated exercises
  from the list when on.
- **Muscle group filter** — options are every distinct value appearing
  across `primaryMuscles`/`secondaryMuscles` in the exercise database,
  rolled up in code (not a fixed list maintained by hand). User picks
  one or more; an exercise matches if the filtered group appears in
  *either* its primary or secondary muscles.
- **Equipment filter** — options are every distinct value appearing in
  `equipment` across the exercise database, rolled up in code the same
  way. User picks one or more equipment types to filter to. This is a
  transient, in-the-moment filter only — the app does not track or
  persist what equipment the user owns (that's the separate, not-yet-
  built "My Gym" section in `BACKLOG.md`).
- No custom sort order — the muscle-group count is displayed per row,
  but the list is not re-sorted by it.
- Tapping a row opens the calibration flow (drill-in) for that
  exercise, whether or not it's already calibrated.

### 2. Calibration flow (drill-in)

Single screen per exercise (not a multi-step wizard).

- **Header**: exercise name, its specific primary and secondary
  muscles (named, not just a count like the list view), and equipment
  required.
- **Form**:
  - **Reps completed** — integer, how many reps were completed to
    failure at the weight used.
  - **Weight used** — the weight for that failure set, in lbs (plain
    numeric field, no unit picker — lbs is the only supported unit for
    now).
  - **Time taken** — populated via an in-app **stopwatch**: a
    start/stop control the user triggers around performing the
    failure set. Doesn't need to be precise to the frame — a plain
    running timer with start/stop is enough. The resulting elapsed
    time populates the time field, which stays a plain editable
    number afterward in case the user needs to correct it.
  - **Mental effort** — a 5-point thumbs scale (two-thumbs-down /
    thumbs-down / neutral / thumbs-up / two-thumbs-up), stored as an
    integer 1–5. Requires an explicit tap — no default value. Exact
    widget/asset implementation is deferred to the feature's task
    plan, not decided here.
  - **Notes** — free-text, optional, for anything the fields above
    don't capture.
- A **Save** action, disabled until reps, weight, time, and effort are
  all explicitly filled in (notes stay optional).
- Saving writes the result to AsyncStorage (see Data shape) and
  returns to the exercise list, which reflects the updated calibration
  status for that exercise.

### 3. Re-calibration

- Opening the flow for an already-calibrated exercise pre-fills the
  form with the existing stored values (reps, weight, time, effort,
  notes).
- Saving overwrites the previous result outright — there is no
  history of past calibration attempts per exercise, only the latest.

## Data shape

### Exercise database — `data/exercises.json`

Static, read-only, bundled with the app (not AsyncStorage). Minimal
shape needed by this feature:

```ts
type Exercise = {
  id: string;            // stable slug, e.g. "barbell-bench-press"
  name: string;           // display name, e.g. "Barbell Bench Press"
  primaryMuscles: string[];   // e.g. ["chest"]
  secondaryMuscles: string[]; // e.g. ["triceps", "shoulders"]
  equipment: string[];        // e.g. ["barbell", "bench"]
};
```

The seed data itself will be supplied directly (as a JSON file) rather
than authored by the coder — the feature's first task covers
validating and wiring in whatever's provided, not writing exercise
entries by hand.

### Calibration results — AsyncStorage

One JSON blob per exercise, keyed by exercise id:

- Key: `calibration:<exerciseId>`
- Value:

```ts
type CalibrationResult = {
  exerciseId: string;
  repsCompleted: number;   // reps to failure at weightUsed
  weightUsed: number;      // lbs
  timeTakenSeconds: number; // from the in-app stopwatch (editable after)
  effort: number;          // 1-5, thumbs scale
  notes: string;           // "" if not provided
  calibratedAt: string;    // ISO 8601 timestamp, set on every save
};
```

Storing one key per exercise (rather than one blob for all results)
keeps reads/writes on the list screen cheap — the list only needs to
know *whether* a result exists per exercise, not its contents.

## Non-goals

- **No Program Builder integration.** This feature only captures and
  stores calibration results, plus the list-level filtering to browse
  the database; ranking/selecting exercises for a program is a
  separate, later feature.
- **No calibration history.** Only the latest result per exercise is
  kept; re-calibrating overwrites, it doesn't append.
- **No custom sort order** on the exercise list — muscle-group count
  and equipment are shown per row, but the list itself isn't
  re-sorted by them. (The previously-backlogged "sort by muscle
  groups hit" item is dropped in favor of this.)
- **No persisted equipment inventory ("My Gym").** The equipment
  filter is transient and derived from the exercise database itself;
  tracking what equipment the user actually owns is the separate,
  not-yet-built "My Gym" section (`BACKLOG.md`).
- **No Android considerations** — iOS only, per project conventions.
