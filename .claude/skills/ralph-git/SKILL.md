---
name: ralph-git
description: Git branching, commit, and worktree mechanics for the Ralph loop — the three-tier commit model (main / feature / task-scratch), the `task/N`, `bugfix/<slug>`, and `chore/<slug>` tag schemes a fresh-context agent uses to reconstruct progress from git alone, the review-handoff tag, rebase-safe tag repointing, the `main-landing/<spec-dir-name>` landing tag, and how docs commits (`CLAUDE.md`, specs, `.claude/`, `BACKLOG.md`) get kept out of disposable scratch history — including that a landed feature's own `specs/<feature>/` directory is sealed and never edited again. Says *how* to run each git operation; see `ralph-loop` for *when* each one happens and who decides. Use whenever a Ralph-loop session needs to run a specific git/worktree command correctly.
---

# Ralph Git

Git mechanics for the Ralph loop — commands and tag conventions only.
For what stage the loop is in, when to run any of this, and who
decides, see `.claude/skills/ralph-loop/SKILL.md`; that skill calls
into this one for the actual commands. At any point, `git log` /
`git tag` alone must be enough to reconstruct what's done, what's in
progress, and where to pick up. Rebase freely on feature/task
branches; never rebase `main` (fast-forward only) or any branch
someone/something else might also be committing to.

## Tags: `task/N`, `bugfix/<slug>`, and `chore/<slug>`

Every unit of work compacted through tier 3 -> tier 2 (see "Why three
tiers" below) is tagged one of three ways, depending on where it came
from:

- **`task/N`** — a `plan.md` task, numbered per that doc.
- **`bugfix/<slug>`** — a fix for one QA-loop diagnosis
  (`specs/<feature>/diagnoses/<slug>.md`), slugged the same as that
  diagnosis's filename.
- **`chore/<slug>`** — a feature-local cross-task hygiene change that
  isn't any single task's or bug fix's job. See "Chore commits" below
  — it's compacted the same way but doesn't get a `-review` tag by
  default.

Everything below — scratch commits, the `-review` tag, compaction, the
plan/diagnosis doc's one-line handoff pointer — works identically for
`task/N` and `bugfix/<slug>`; substitute one for the other wherever an
example uses either. The namespaces never collide (`task/` vs
`bugfix/` vs `chore/` prefix), and boundary tags chain across all three
in whatever order the work actually happened — the "previous boundary
tag" for a compaction is simply whichever tag was set most recently,
not necessarily the highest task number.

## Commands & flows

**Use the `EnterWorktree`/`ExitWorktree` tools for all worktree
creation and teardown — never raw `git worktree add`/`git worktree
remove`.** This keeps worktrees under `.claude/worktrees/` (not
scattered as sibling directories) and keeps them tracked for
exit-time cleanup.

This repo pins `worktree.baseRef: "head"` in `.claude/settings.json`.
That's required, not cosmetic: the default (`fresh`) branches from
`origin/<default-branch>`, but this project pushes to `origin` only
when a human lands a feature — `main` routinely sits ahead of
`origin/main` with local-only commits (specs, plans, seed data).
Branching from `origin/main` would silently drop those. If this
setting is ever missing, add it before creating a worktree rather than
proceeding on a stale base.

**Starting a feature's worktree**

```
EnterWorktree(name: "feature/<feature-name>")
```

Creates the worktree under `.claude/worktrees/`, branches it from
local `main` (per `baseRef: "head"`), and switches the *orchestrating*
session into it:

```bash
git tag task/0-done              # compaction boundary for task 1
```

The driver stays here — the orchestrating session runs from inside the
feature's worktree for the rest of the feature's life, not the main
checkout. (This used to hand back to the main checkout via
`ExitWorktree` right after creation; don't do that — it was a real
source of confusion, running app-launch commands against the wrong
checkout without noticing.) Note the worktree's absolute path (from
`EnterWorktree`'s result or `git worktree list`) regardless — every
subagent invocation still needs it explicitly, since a subagent's
working directory is pinned independently at launch and does not
inherit the driver's, see below.

**Rooting subagents in the worktree.** The orchestrating session
being inside (or having been inside) the worktree does **not** mean a
subagent spawned via the `Agent` tool starts there — a subagent's
working directory is pinned independently at launch. Every `coder`/
`reviewer`/`diagnosis` invocation must:

1. Be given the worktree's absolute path in the prompt.
2. Call `EnterWorktree(path: <that path>)` as its first action, before
   reading specs or touching git — this only pins that agent's own
   session and doesn't affect the orchestrator or any other subagent.

This is enforced in `coder.md`, `reviewer.md`, and `diagnosis.md`
themselves (their "Before you start" step), not only documented here,
because a fresh orchestrating iteration may not reload this skill
before spawning a subagent — the instruction needs to live somewhere
that's read every time regardless.

**Working a unit of work (tier 3, scratch)** — commit freely. Each
message should let a fresh read of `git log` answer "what's the state
of this task right now" with no other context:

```
wip(task-3): scaffold ProgramForm, save handler not wired — next: wire AsyncStorage write
wip(bugfix/hide-calibrated-stale-filter): add failing test for post-calibration list refresh
```

Recovery after a context reset: `git log <previous-boundary-tag>..HEAD`.

**Handing off for review** — once the gate is green, the last scratch
commit states plainly what's ready:

```
wip(task-3): ready for review — clamp calibration effort to 1-5, gate green
```

```bash
git tag task/3-review              # or: git tag bugfix/<slug>-review
```

The reviewer's diff range is `task/2-done..task/3-review` (substitute
the actual previous boundary tag and this one) — the same range-
reading pattern as context-reset recovery above, just reused as the
review scope. The coder's only touch to the plan/diagnosis doc is one
line recording this tag; no prose, no implementation notes. Anything
about *why* a non-obvious implementation choice was made goes as a
comment in the code next to that choice, not in the doc and not in a
separate handoff doc — the reviewer should be checking the work
against the spec/diagnosis and the code, not against the coder's own
account of itself.

If the reviewer requests changes: more scratch commits, then move the
same tag to the new tip (`git tag -f task/3-review`) rather than
minting a new one per round — one tag per unit of work to track,
always pointing at the current ready-for-review state.

**Completing a unit of work (tier 3 -> tier 2)** — once its
verification gate (typecheck/lint/tests) passes and the reviewer
subagent approves the review tag:

```bash
git reset --soft task/2-done       # previous boundary tag, of either kind
```

The plan/diagnosis doc's handoff line still reads the review tag —
before committing, edit it to point at the done tag instead, so the
doc never points at a tag that's about to be deleted:

```
**Handoff:** `task/3-review`   ->   **Handoff:** `task/3-done`
```

Check `git status` for an uncommitted
`specs/<feature>/engineering-log.md` too — the reviewer appends to it
via the `engineering-log` skill's script but never commits, so its
entries for this unit of work are sitting uncommitted in the working
tree until this step folds them in.

```bash
git add specs/<feature>/plan.md specs/<feature>/engineering-log.md
git commit -m "task: <task-id> — <summary>  (spec: specs/<feature>/plan.md#<task-id>)"
git tag task/3-done
git tag -d task/3-review            # superseded — keeping it around only invites it going stale
```

For a bug fix, the same shape, different doc and prefix:

```bash
git add specs/<feature>/diagnoses/<slug>.md specs/<feature>/engineering-log.md
git commit -m "bugfix: <slug> — <summary>  (diagnosis: specs/<feature>/diagnoses/<slug>.md)"
git tag bugfix/<slug>-done
git tag -d bugfix/<slug>-review
```

## Chore commits

Not every commit maps to a `plan.md` task or a QA-loop bug fix —
cross-task hygiene (a comment sweep across already-landed tasks, a
`plan.md` renumbering, a small refactor spanning several tasks' files)
genuinely belongs to the feature but isn't any single unit of work's
job. Folding it into whichever task happens to compact next is the
failure mode to avoid: it makes that task's tier-2 commit
un-discardable, since throwing away the task also throws away the
chore buried inside it — directly against the point of keeping
task-scratch history cheap to discard (see "Why three tiers" below).

First decide which kind of chore this is — the same split as
`specs/README.md`'s feature-local `backlog.md` vs. the repo-root
`BACKLOG.md`:

- **Feature-local** — only makes sense because of work this feature
  did (a renumbering, a sweep over files this feature touched). Tag it
  `chore/<slug>` on the feature branch, per the boundary-time check
  below.
- **Out-of-band** — would still make sense if this feature didn't
  exist (an unrelated bug found by manual testing, an infra fix like a
  bundler config change). Skip the chore tag entirely — treat it like
  a docs commit via the agent-docs escape hatch below: commit it
  standalone, land it on `main` on its own schedule, then rebase the
  feature branch to pick it up.

**Boundary-time check.** Before spawning the next task's or bug fix's
`coder`, check whether anything sits between the previous boundary tag
and now that isn't a docs commit (already covered by the escape hatch
below): `git log --oneline <prev-boundary-tag>..HEAD`. If a
feature-local chore is there, compact it the same way as a task,
before the next unit's own scratch history starts:

```bash
git reset --soft task/8-done          # or whichever tag is current
git commit -m "chore: <summary>"
git tag chore/<slug>-done
```

No `-review` tag or reviewer pass by default — these are driver-
authored, and usually small enough to trust directly; run one through
the reviewer anyway if not confident about it. The next unit of work's
scratch commits build on top of `chore/<slug>-done` as their new
previous-boundary tag.

**Mid-task discovery.** If a coder finds it needs an unrelated fix to
keep going on its own task, it commits that fix as its own commit —
isolated from its task-scratch commits, not touching the same lines —
with a distinct, greppable message: `chore(scratch): <what, why>`
(instead of its usual `wip(task-N): ...`). It keeps working on top and
does not stop to flag this the way it would a scope ambiguity.

This is as far as the mechanism goes for now — there's no automated
extraction of a `chore(scratch):` commit that landed in the middle of
a task's own scratch history. If that task is later thrown away in its
entirety, the chore goes with it; recover it by hand at that point
(write it up as a backlog item before discarding, reapply once the
task restarts) rather than by rebase surgery. Revisit building real
extraction tooling only once this has actually happened and it's clear
what shape is actually needed.

**Keeping the feature branch current with `main`**:

```bash
git fetch origin main              # if applicable
git rebase main
```

Rebasing rewrites every commit's SHA on the feature branch — existing
tags (`task/N-*`, `bugfix/<slug>-*`) still point at the old, now-
orphaned pre-rebase commits, not their equivalents in the rebased
history. Git does not move tags for you here (unlike `--update-refs`,
which only tracks branches). Immediately after any rebase, before
doing anything else, re-point every tag currently in use:

```bash
git tag -l 'task/*' 'bugfix/*'             # every tag to check
git log --oneline task/2-done..HEAD        # find each one's new commit — same message, new SHA
git tag -f task/2-done <new-sha>           # repeat per tag
```

Commit messages survive a rebase even though SHAs don't, so matching
old tag to new commit by message is the reliable way to do this by
hand.

**Landing a feature (tier 2 -> tier 1, human-run)**:

```bash
git checkout feature/<feature-name>
git rebase main
git reset --soft main              # collapse every task/bugfix/chore commit into one staged changeset
git commit -m "feat: <feature summary>"
git checkout main
git merge --ff-only feature/<feature-name>
git tag main-landing/<spec-dir-name>   # e.g. main-landing/20260705-exercise-calibration
```

The `checkout main && merge --ff-only` step is run by a human, not the
agent — same boundary as "never push to main unattended." The landing
tag reuses the feature's own `specs/<yyyymmdd>-<feature-name>/`
directory name verbatim, so `git tag -l 'main-landing/*'` alone answers
"what shipped and when" without needing commit-message archaeology
across however many docs commits happen to sit on `main` around it.

**Agent-docs escape hatch** — anything touching `CLAUDE.md`,
`AGENTS.md`, `specs/`, `.claude/`, `BACKLOG.md` gets its own commit,
never mixed with app code. **Exception: a landed feature's own
`specs/<feature>/` directory is sealed once its
`main-landing/<spec-dir-name>` tag exists (`specs/README.md`, "Once a
feature lands") — this escape hatch is for docs still actively
changing, never for editing history that's already shipped.** If a
docs commit ends up buried in scratch history, pull it out before a
`reset --soft` or worktree removal destroys it:

```bash
git log --oneline task/2-done..HEAD -- CLAUDE.md specs/ .claude/ BACKLOG.md
git cherry-pick <docs-commit-sha>                        # onto the feature branch
git checkout main && git cherry-pick <docs-commit-sha>   # optional: land it early
git checkout feature/<feature-name> && git rebase main   # pick up main's new tip
```

If the same commit gets cherry-picked onto both the feature branch and
`main`, `git rebase`'s patch-id detection usually drops the duplicate;
otherwise drop it manually during the rebase.

**Cleanup (after a feature lands)**:

```
EnterWorktree(path: <worktree path>)   # if not already the active session there
ExitWorktree(action: "remove")          # deletes the worktree dir and its branch
```

Use `action: "keep"` instead if you want to preserve the raw scratch
history around for a while before deleting.

## Why three tiers

| Tier | Where | Granularity | Audience | Discipline |
|---|---|---|---|---|
| 1. `main` | stable branch | one commit per feature | human review | squash-landed, fast-forward only, never touched by the agent directly |
| 2. feature branch | one worktree per feature | one commit per completed + verified unit of work (task or bug fix) | occasional human spot-checks, agent task-tracking | compacted from tier 3, boundary tagged |
| 3. scratch | same worktree, mid-task or mid-fix | as many commits as needed | agent's own recovery across context resets | freeform, but each commit must stand on its own when read cold |

Each tier serves a different reader, so it earns a different
granularity: scratch commits exist purely so the agent can resume
itself, tier-2 commits exist so a human or the next unit of work can
see completed work at a glance, and `main` should only ever show
feature-sized changes. Compacting tier 3 -> tier 2 with `reset --soft`
(not an interactive rebase squash) is simplest for this: no replay, no
conflict surface, just moving the branch pointer and recommitting the
already-correct working tree.

Worktrees are per-feature, not per-task — units of work within a
feature are sequential, so they only need clean commit boundaries, not
physical isolation. Reach for worktree-per-task only when tasks are
genuinely parallel (multiple agents on independent slices at once).

Docs get their own commits so agent-instruction changes never depend
on disposable scratch history being kept around, and can reach `main`
on their own schedule instead of waiting on the feature they happened
to be made during.
