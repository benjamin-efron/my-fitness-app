# Spec: Exercise Calibration

Status: **planned** — see `plan.md` for the task breakdown the
`coder`/`reviewer` loop will work through.

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

### Muscle group display (applies everywhere muscles are shown)

Anywhere the app shows an exercise's muscles — the list card and the
drill-in header — primary and secondary muscles are visually
distinguished from each other: primary muscles use a more vibrant/
prominent treatment, secondary muscles a more muted one. This is a
two-tier distinction only (primary vs. secondary), not a color per
individual muscle group — a distinct color per muscle name would be
more visual noise than signal at this list density.

### 0. Home screen entry point

The app's home screen has a single link/button to the Exercise
Calibration list (`/calibrate`). No other home-screen content yet —
the other app sections (Program Builder, Workout Tracker, History
Viewer) don't exist, so this isn't a navigation menu, just an entry
point to this feature.

### 1. Exercise list (`/calibrate`)

- Shows every exercise in the exercise database (`data/exercises.json`)
  as a list. Each row (card) shows:
  - name
  - all muscle groups worked, split into a primary list and a
    secondary list (using the primary/secondary highlighting
    convention above), not just a count
  - equipment required
  - whether it's been calibrated yet (e.g. a checkmark/badge)
- **Sort order**: default sort is by total muscle groups worked
  (primary + secondary combined count), most first — this is the
  "highest-value exercise" signal described in the Summary. See the
  target muscle group filter below for how sort changes when it's
  active.
- A **search bar** filters the list by exercise name as the user
  types.
- A **hide calibrated** toggle removes already-calibrated exercises
  from the list when on.
- **Muscle group filter** — options are every distinct value appearing
  across `primaryMuscles`/`secondaryMuscles` in the exercise database,
  rolled up in code (not a fixed list maintained by hand). User picks
  one or more; an exercise matches if a filtered group appears in
  *either* its primary or secondary muscles — there's no separate
  "match as primary only" / "match as secondary only" toggle.
  - **Target muscle group sort.** When exactly one muscle group is
    selected in this filter (a single "target"), the sort order
    changes from the default total-count sort to a two-tier sort:
    exercises where the target is a *primary* muscle first, then
    exercises where it's only a *secondary* muscle (ties within each
    tier fall back to the default total-count sort). A toggle lets the
    user flip which tier comes first (secondary-matches before
    primary-matches). This sort only applies with a single target
    selected — filtering on multiple groups at once uses the default
    sort.
- **Equipment filter** — options are every distinct value appearing in
  `equipment` across the exercise database, rolled up in code the same
  way. User picks one or more equipment types to filter to. This is a
  transient, in-the-moment filter only — the app does not track or
  persist what equipment the user owns (that's the separate, not-yet-
  built "My Gym" section in `BACKLOG.md`).
- Tapping a row opens the calibration flow (drill-in) for that
  exercise, whether or not it's already calibrated.

### 2. Calibration flow (drill-in)

Single screen per exercise (not a multi-step wizard).

- **Header**: exercise name, its specific primary and secondary
  muscles (named, not just a count like the list view, using the
  primary/secondary highlighting convention above), and equipment
  required.
- **Form**:
  - **Reps completed** — integer, how many reps were completed to
    failure at the weight used.
  - **Weight used** — the weight for that failure set, in lbs (plain
    numeric field, no unit picker — lbs is the only supported unit for
    now).
  - **Time taken** — two supported entry modes, user's choice:
    - **Precise** — either an in-app **stopwatch** (start/stop control
      the user triggers around performing the failure set; doesn't
      need frame-level precision, a plain running timer is enough) or
      typing a number of seconds directly. Both populate the same
      numeric seconds value, and it stays a plain editable field
      afterward either way — the stopwatch is a convenience for
      filling it in, not the only way to.
    - **Approximate** — for when the user doesn't want to time a set
      precisely, a coarse **short / moderate / long** bucket instead
      of a number.
    A given calibration stores one or the other, not both (see Data
    shape).
  - **Mental effort** — a 5-point thumbs scale (two-thumbs-down /
    thumbs-down / neutral / thumbs-up / two-thumbs-up), stored as an
    integer 1–5. Requires an explicit tap — no default value. Exact
    widget/asset implementation is deferred to the feature's task
    plan, not decided here.
  - **Notes** — free-text, optional, for anything the fields above
    don't capture.
- A **Save** action, disabled until reps, weight, effort, and a time
  value (precise or approximate) are all explicitly filled in (notes
  stay optional).
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
type TimeTaken =
  | { kind: 'precise'; seconds: number }       // stopwatch or typed directly
  | { kind: 'approximate'; bucket: 'short' | 'moderate' | 'long' };

type CalibrationResult = {
  exerciseId: string;
  repsCompleted: number;   // reps to failure at weightUsed
  weightUsed: number;      // lbs
  time: TimeTaken;
  effort: number;          // 1-5, thumbs scale
  notes: string;           // "" if not provided
  calibratedAt: string;    // ISO 8601 timestamp, set on every save
};
```

`time` is a discriminated union rather than two nullable fields so a
stored result can't end up with both a precise time and a bucket, or
neither — every calibration has exactly one.

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
- **No per-muscle-group color coding.** Muscle display is a two-tier
  primary/secondary distinction only, not a distinct color per muscle
  name — see "Muscle group display" above.
- **No persisted equipment inventory ("My Gym").** The equipment
  filter is transient and derived from the exercise database itself;
  tracking what equipment the user actually owns is the separate,
  not-yet-built "My Gym" section (`BACKLOG.md`).
- **No Android considerations** — iOS only, per project conventions.
