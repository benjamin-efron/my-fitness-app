---
name: ralph-git
description: Git branching, commit, and worktree discipline for Ralph-loop / agentic coding iteration. Defines a three-tier commit model (main / feature / task-scratch), tag-based progress tracking so a fresh-context agent can reconstruct status from git alone, a review-handoff tag that hands a task to a fresh-context reviewer without a prose handoff doc, a rebase-first workflow for landing work, and how to keep agent-instruction docs (CLAUDE.md, specs, .claude/) from getting lost in disposable scratch history. Use when running an autonomous or semi-autonomous coding loop where git state needs to be legible without conversation memory and safely reversible at every granularity.
---

# Ralph Git

Git discipline for agentic coding loops (fresh context per iteration —
state lives in git, not conversation). At any point, `git log` /
`git tag` alone must be enough to reconstruct what's done, what's in
progress, and where to pick up. Rebase freely on feature/task branches;
never rebase `main` (fast-forward only) or any branch someone/something
else might also be committing to.

## Commands & flows

**Use the `EnterWorktree`/`ExitWorktree` tools for all worktree
creation and teardown — never raw `git worktree add`/`git worktree
remove`.** This keeps worktrees under `.claude/worktrees/` (not
scattered as sibling directories) and keeps them tracked for
exit-time cleanup.

This repo pins `worktree.baseRef: "head"` in `.claude/settings.json`.
That's required, not cosmetic: the default (`fresh`) branches from
`origin/<default-branch>`, but this project pushes to `origin` only
when a human lands a feature (see "Landing a feature" below) — `main`
routinely sits ahead of `origin/main` with local-only commits (specs,
plans, seed data). Branching from `origin/main` would silently drop
those. If this setting is ever missing, add it before creating a
worktree rather than proceeding on a stale base.

**New feature**

```
EnterWorktree(name: "feature/<feature-name>")
```

This creates the worktree under `.claude/worktrees/`, branches it
from local `main` (per `baseRef: "head"`), and switches the
*orchestrating* session into it. From there:

```bash
git tag task/0-done              # compaction boundary for task 1
```

Then return the orchestrating session to its normal directory — it
doesn't write code itself, subagents do:

```
ExitWorktree(action: "keep")
```

Note the worktree's absolute path (from `EnterWorktree`'s result or
`git worktree list`) — every subagent invocation for this feature
needs it, see below.

**Rooting subagents in the worktree.** The orchestrating session
being inside (or having been inside) the worktree does **not** mean a
subagent spawned via the `Agent` tool starts there — a subagent's
working directory is pinned independently at launch. Every `coder`/
`reviewer` invocation must:

1. Be given the worktree's absolute path in the prompt.
2. Call `EnterWorktree(path: <that path>)` as its first action, before
   reading specs or touching git — this only pins that agent's own
   session and doesn't affect the orchestrator or any other subagent.

This is enforced in `coder.md` and `reviewer.md` themselves (their
"Before you start" step), not only documented here, because a fresh
orchestrating iteration may not reload this skill before spawning a
subagent — the instruction needs to live somewhere that's read every
time regardless.

**Working a task (tier 3, scratch)** — commit freely. Each message
should let a fresh read of `git log` answer "what's the state of this
task right now" with no other context:

```
wip(task-3): scaffold ProgramForm, save handler not wired — next: wire AsyncStorage write
```

Recovery after a context reset: `git log task/2-done..HEAD`.

**Handing off a task for review** — once the gate is green, the
coder's last scratch commit states plainly what's ready:

```
wip(task-3): ready for review — clamp calibration effort to 1-5, gate green
```

```bash
git tag task/3-review            # ready-for-review boundary, distinct from task/3-done
```

The reviewer's diff range is `task/2-done..task/3-review` — the same
range-reading pattern as context-reset recovery above, just reused as
the review scope. The coder's only touch to the spec doc is one line
recording this tag; no prose, no implementation notes. Anything about
*why* a non-obvious implementation choice was made goes as a comment
in the code next to that choice, not in the spec and not in a separate
handoff doc — the reviewer should be checking the task against the
spec and the code, not against the coder's own account of itself.

If the reviewer requests changes: more scratch commits, then move the
same tag to the new tip (`git tag -f task/3-review`) rather than
minting a new one per round — one tag per task to track, always
pointing at the current ready-for-review state.

**Completing a task (tier 3 -> tier 2)** — once its verification gate
(typecheck/lint/tests) passes and the reviewer subagent approves the
`task/N-review` tag. This step is the orchestrating session's job, not
the coder's or reviewer's — it already owns the squash, so the doc and
tag cleanup below happen in the same moment rather than drifting:

```bash
git reset --soft task/2-done     # previous boundary tag (task/0-done for task 1)
```

`plan.md`'s Handoff line for this task still reads the review tag (the
coder's only touch to that doc, per `specs/README.md`) — before
committing, edit it to point at the done tag instead, so the doc never
points at a tag that's about to be deleted:

```
**Handoff:** `task/3-review`   ->   **Handoff:** `task/3-done`
```

Check `git status` for an uncommitted
`specs/<feature>/architecture-log.md` too — the reviewer appends to it
via the `architecture-log` skill's script but never commits (see
`reviewer.md`'s Boundaries), so its entries for this task are sitting
uncommitted in the working tree until this step folds them in.

```bash
git add specs/<feature>/plan.md specs/<feature>/architecture-log.md
git commit -m "task: <task-id> — <summary>  (spec: specs/<feature>/plan.md#<task-id>)"
git tag task/3-done
git tag -d task/3-review         # superseded — keeping it around only invites it going stale
```

**Keeping the feature branch current with `main`** — only if something
landed on `main` mid-feature (usually a docs commit via the escape
hatch below). Do this before further task work and before landing:

```bash
git fetch origin main            # if applicable
git rebase main
```

Rebasing rewrites every commit's SHA on the feature branch — existing
tags (`task/N-done`, `task/N-review`) still point at the old,
now-orphaned pre-rebase commits, not their equivalents in the rebased
history. Git does not move tags for you here (unlike `--update-refs`,
which only tracks branches). Immediately after any rebase, before
doing anything else, re-point every tag currently in use:

```bash
git tag -l 'task/*'                        # every tag to check
git log --oneline task/2-done..HEAD        # find each one's new commit — same message, new SHA
git tag -f task/2-done <new-sha>           # repeat per tag
```

Commit messages survive a rebase even though SHAs don't, so matching
old tag to new commit by message is the reliable way to do this by
hand.

**Landing a feature (tier 2 -> tier 1, human-run)**: before landing,
resolve every open tradeoff the reviewer flagged for human judgment
rather than deciding itself (see `reviewer.md`'s "Needs human
decision" section) — this is exactly what keeping review files
around instead of deleting them was for:

```bash
grep -l '## Needs human decision' .claude/review/*.md
```

A landed feature shouldn't carry forward a decision nobody actually
made. Once every flagged file is resolved (edit the code, or edit the
review file to record the decision taken):

```bash
git checkout feature/<feature-name>
git rebase main
git reset --soft main            # collapse every task commit into one staged changeset
git commit -m "feat: <feature summary>"
git checkout main
git merge --ff-only feature/<feature-name>
```

The `checkout main && merge --ff-only` step is run by a human, not the
agent — same boundary as "never push to main unattended."

**Agent-docs escape hatch** — anything touching `CLAUDE.md`,
`AGENTS.md`, `specs/`, `.claude/`, `BACKLOG.md` gets its own commit,
never mixed with app code. If a docs commit ends up buried in scratch
history, pull it out before a `reset --soft` or worktree removal
destroys it:

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
| 2. feature branch | one worktree per feature | one commit per completed + verified task | occasional human spot-checks, agent task-tracking | compacted from tier 3, boundary tagged |
| 3. scratch | same worktree, mid-task | as many commits as needed | agent's own recovery across context resets | freeform, but each commit must stand on its own when read cold |

Each tier serves a different reader, so it earns a different
granularity: scratch commits exist purely so the agent can resume
itself, task commits exist so a human or the next task can see
completed work at a glance, and `main` should only ever show
feature-sized changes. Compacting tier 3 -> tier 2 with `reset --soft`
(not an interactive rebase squash) is simplest for this: no replay, no
conflict surface, just moving the branch pointer and recommitting the
already-correct working tree.

Worktrees are per-feature, not per-task — tasks within a feature are
sequential, so they only need clean commit boundaries, not physical
isolation. Reach for worktree-per-task only when tasks are genuinely
parallel (multiple agents on independent slices at once).

Docs get their own commits so agent-instruction changes never depend
on disposable scratch history being kept around, and can reach `main`
on their own schedule instead of waiting on the feature they happened
to be made during.
