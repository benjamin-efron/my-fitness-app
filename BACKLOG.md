# Backlog

Ideas and known follow-ups, not yet scheduled. Pull items off this list into active work when ready.

## Loop-Based Development Foundation

Setup to work through before resuming feature work under the Ralph loop pattern. Starting small: two subagents (coder, reviewer), run by hand. See `.claude/skills/ralph-git/SKILL.md` for the git discipline the loop will follow once building starts.

### Subagent definitions
- **Coder subagent brief.** Owns planning, implementation, and testing for a task end to end. Needs: scope of authority (can it edit specs, or only implement them?), which files/tools it can touch, how it signals "done" (ties into the ralph-git commit/tag scheme), and what it self-checks before handing off to review.
- **Reviewer subagent brief.** Starts in a fresh context with no memory of how the code was written. Reviews the diff against the spec, not a general code review. Needs: what ref range it diffs, what it's allowed to flag (spec conformance vs. bugs vs. style), and a fixed output format (approve / request-changes + structured findings).
- **Coder ↔ reviewer handoff protocol.** How review feedback gets back to the coder, and how the loop knows to stop — max iterations, explicit approval, or escalate to the human.

### Harness tooling
- **Pick a validation stack.** No test runner is installed yet (no Jest, no RN Testing Library). Decide what automated "tests" mean for a solo-prototyping Expo app before agents start writing them, so the reviewer has something objective to check beyond reading code.
- **One script, fast, agent-runnable checks.** At minimum typecheck (`tsc --noEmit`) and lint (`expo lint`), wired into a single non-interactive script that fails loudly, so both subagents run the same gate.
- **App-interaction scripts for agents.** Decide how the coder confirms a change actually works without a human watching a simulator — e.g. a headless boot check (Expo web target), and/or a screenshot-capture step the reviewer can inspect for UI changes.
- **AsyncStorage test doubles.** All app state lives in AsyncStorage — agents need a standard way to seed/inspect/clear it in tests and dev builds rather than each task inventing its own.

### Spec docs
- **Spec template + location.** Decide where feature specs live (e.g. `specs/`) and what a spec must contain (user-facing behavior, data shape, explicit non-goals) so the coder and reviewer are checking work against the same document, not tribal knowledge.
- **Exercise Calibration spec (first one to write).** Fresh spec for the feature now that the old implementation is cleared out — first real test of the template above, and the first thing the loop will build against.

### Also worth deciding before iterating
- **AGENTS.md as source of truth.** Write `AGENTS.md` as the real instructions doc; have `CLAUDE.md` `@`-reference it so this harness and any AGENTS.md-native tooling read the same file instead of two drifting copies.
- **A single "current task" pointer.** A small file (e.g. `NOW.md`) the loop always points agents at — distinct from this backlog, which is "someday": this is "what the coder is working on this iteration."
- **Iteration boundaries / stop conditions.** Since the loop is run by hand at first, decide up front what one manual iteration covers (one backlog item? one spec section?) and what "done for the session" looks like, so stopping is a decision, not a drift.

## Exercise Calibration

- **Switch effort rating from 1-10 to 1-5.** Ideally a thumbs-based scale (e.g. two thumbs down / thumbs down / neutral / thumbs up / two thumbs up) rather than a numeric scale. Blocked on sourcing/creating thumb icon assets for the two-thumbs-down and two-thumbs-up ends.
- **Muscle group filter buttons on the calibration list (`/calibrate`).** Let the user tap a muscle group (chest, back, biceps, etc.) to filter the exercise list down to exercises that hit that group.
- **Sort by muscle groups hit when filtering.** When a muscle group filter is active, sort matching exercises by total number of muscle groups they hit (primary + secondary), highest first, so the most efficient/highest-value exercises surface first.
- **Equipment filter on the calibration list.** Filter exercises down to ones usable with equipment the user actually has.

## My Gym (new section)

- New section for the user to record what equipment they have available (implied by the equipment filter above). Needed before the equipment filter can be built.
