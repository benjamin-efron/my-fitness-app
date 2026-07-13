# Backlog

Ideas and known follow-ups, not yet scheduled. Pull items off this list into active work when ready.

## Loop-Based Development Foundation

Setup to work through before resuming feature work under the Ralph loop pattern. Starting small: two subagents (coder, reviewer), run by hand. See `.claude/skills/ralph-git/SKILL.md` for the git discipline the loop will follow once building starts.

### Spec docs
- ~~Spec template + location.~~ Done — see `specs/README.md`.
- ~~Exercise Calibration spec.~~ Done — see `specs/exercise-calibration/spec.md`.
- ~~Exercise Calibration `plan.md`.~~ Done — see `specs/exercise-calibration/plan.md`. 11 tasks, first blocked on the seed JSON being supplied (task 1).

### Also worth deciding before iterating
- **AGENTS.md as source of truth.** Write `AGENTS.md` as the real instructions doc; have `CLAUDE.md` `@`-reference it so this harness and any AGENTS.md-native tooling read the same file instead of two drifting copies.
- **A single "current task" pointer.** A small file (e.g. `NOW.md`) the loop always points agents at — distinct from this backlog, which is "someday": this is "what the coder is working on this iteration."
- **Iteration boundaries / stop conditions.** Since the loop is run by hand at first, decide up front what one manual iteration covers (one backlog item? one spec section?) and what "done for the session" looks like, so stopping is a decision, not a drift.
- **AsyncStorage test doubles.** All app state lives in AsyncStorage — agents need a standard way to seed/inspect/clear it in tests and dev builds rather than each task inventing its own. Not yet decided; carried over from harness setup since it didn't come up while wiring Jest/RNTL.

## Exercise Calibration

Thumbs-based effort scale, muscle-group filter, and equipment filter
are now in scope in `specs/exercise-calibration/spec.md` rather than
backlogged — nothing left here for those. "Sort by muscle groups hit"
was considered and deliberately dropped as a non-goal in that spec.

## My Gym (new section)

- New section for the user to record what equipment they have
  available. No longer a blocker for the calibration equipment filter
  (that filter is transient/derived from the exercise database per
  `specs/exercise-calibration/spec.md`) — this is still worth building
  for its own sake whenever a feature actually needs a persisted
  equipment inventory.
