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
- **Skill-creation guidance.** When does something belong in a new repo-scoped skill vs. `CLAUDE.md`/an agent doc, and how should skills get maintained as they accumulate? Came up while deciding where to document the `theme.ts` placeholder pattern; no answer yet.
- **Where agent-discovered deferred-architecture concerns belong.** Coder-discovered gaps that don't block the current task (e.g. the Exercise Calibration `theme.ts` placeholder) currently get noted in this file, but this file reads as the user's own idea-dump, not a queue for the agent to flag things that might need triage or handling soon. Worth a separate mechanism later; fine to keep using this file for now while still learning the loop.
- **The "seam" / anti-corruption-layer pattern deserves a closer look.** Used ad hoc for the `theme.ts` placeholder (`specs/exercise-calibration`); worth reading up on the general pattern in case there are useful conventions to adopt beyond what got improvised here.
- **Landing docs-only commits on `main` independently, mid-feature.** `ralph-git`'s escape hatch already covers cherry-picking a docs commit out of scratch history so it isn't lost, but doing this well — landing it on `main` on its own schedule without it depending on the feature it happened to be made during — got complex enough in practice (see the `task/N-done` tag-repointing dance from the Exercise Calibration loop) that it's worth revisiting this part of the flow more critically rather than trusting the current escape hatch as final.
- **No escape hatch for cross-cutting "chore" commits.** The tier model assumes every commit is either a task's own scoped work or a docs-only change — there's no clean slot for something like a small refactor/hygiene sweep that touches files from several already-landed tasks, or that lands after a task's review tag but before its compaction. Handling this currently means manual `reset --hard` + cherry-pick surgery each time it comes up (happened twice in the Exercise Calibration loop's task 4/5 compaction). Worth designing a real convention — maybe a fourth commit type, or clearer rules for when a boundary tag needs to move forward — instead of improvising it each time.
- **No provisioned iOS simulator for agent-driven UI validation.** Discovered mid-Exercise-Calibration-loop (after task 7 landed) that `xcrun simctl` has no installed runtime — every listed device profile is `(unavailable, runtime profile not found)` — so an agent can't currently launch/screenshot the app itself; the user validates manually via Expo Go instead. Set up a simulator runtime an agent can drive (screenshot, tap, type) for real validation instead of trusting typecheck/lint/tests alone. Likely pairs with two related, not-yet-designed pieces: (1) additional validation gates beyond the current tsc/lint/test trio — something that actually exercises rendered UI; (2) formalizing simulator-driven checks as a real step in the coder/reviewer flow (`.claude/agents/coder.md`, `.claude/agents/reviewer.md`, and/or the `testing` skill), not just an ad hoc "go look at it" step.
- **No strategy for "out-of-band" bugs discovered outside any task's scope.** Surfaced when the user tried validating tasks 1-7 in Expo Go for the first time and hit a real crash (co-located `*.test.tsx` files under `src/app/` were being swept into Expo Router's route bundle and crashing on-device — see the `metro.config.js` fix folded into `task/7-done`). Nothing in the coder/reviewer loop currently answers "who investigates this, who decides the fix, and which tier/task does it land under" for a bug that isn't part of any task's acceptance criteria — this time it got diagnosed and fixed by the orchestrating session directly (not a coder subagent) and folded backward into the current task's boundary tag, by explicit user decision made in the moment rather than an established convention. Related to, but distinct from, the "no escape hatch for cross-cutting chore commits" item above — that one is about hygiene/refactor sweeps with a clear author (a coder mid-loop); this is about *undiscovered breakage* found by manual validation, possibly gated behind having an actual UI-validation step at all (see the simulator item above — this bug would likely have been caught immediately if any simulator-driven check existed). Also note: **`main`'s own hello-world app has the identical latent bug** (`src/app/index.test.tsx` under `src/app/`) — the fix hasn't been applied there yet, only on the feature branch.
- **No formalized process for updating a spec/plan mid-feature.** `specs/README.md`'s "Changing a spec mid-feature" section says *that* it must happen deliberately as its own agent-docs commit, but not *how* — the actual mechanics have been improvised twice now in the Exercise Calibration loop: task 4's review surfaced a rendering concern and got resolved by inserting tasks 5-6 and renumbering 7-13 to what followed; then a manual-validation gap (missing home-screen entry point, discovered after task 7) got resolved by inserting a new task 8 and renumbering the old 8-13 to 9-14. Both times: no fixed rule for *where* a new task gets inserted vs. appended, who decides that placement, or how to avoid stale task-number references elsewhere (this is exactly why the coder's comment-hygiene convention bans plan.md task numbers in code comments — discovered because renumbering already broke a reference once). Worth a real convention: e.g. always append and let ordering be informal, or a lighter task-ID scheme that survives renumbering (letters/decimals instead of sequential integers), or explicit criteria for "insert now" vs. "append."

## Exercise Calibration

Thumbs-based effort scale, muscle-group filter, and equipment filter
are now in scope in `specs/exercise-calibration/spec.md` rather than
backlogged — nothing left here for those. "Sort by muscle groups hit"
was considered and deliberately dropped as a non-goal in that spec.

- **Human-readable muscle group names.** `data/exercises.json`'s
  `primaryMuscles`/`secondaryMuscles` values are raw identifiers
  (`upper_back`, `quads`, `lats`, etc.) rendered as-is by
  `ExerciseCard` and (once task 9 lands) the muscle-group filter —
  no display-name mapping exists. Needs a `muscleGroupId ->` display
  label lookup (e.g. `upper_back` -> "Upper Back", `quads` ->
  "Quadriceps", `lats` -> "Lats" or "Latissimus Dorsi") used
  everywhere a muscle group is shown or listed as a filter option,
  rather than each call site formatting the raw string itself.

## My Gym (new section)

- New section for the user to record what equipment they have
  available. No longer a blocker for the calibration equipment filter
  (that filter is transient/derived from the exercise database per
  `specs/exercise-calibration/spec.md`) — this is still worth building
  for its own sake whenever a feature actually needs a persisted
  equipment inventory.
