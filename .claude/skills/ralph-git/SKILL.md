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

**New feature**

```bash
git checkout main
git pull --ff-only              # no-op if local-only
git worktree add ../<repo>-<feature> -b feature/<feature-name>
cd ../<repo>-<feature>
git tag task/0-done              # compaction boundary for task 1
```

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
`task/N-review` tag:

```bash
git reset --soft task/2-done     # previous boundary tag (task/0-done for task 1)
git commit -m "task: <task-id> — <summary>  (spec: specs/<feature>/plan.md#<task-id>)"
git tag task/3-done
```

**Keeping the feature branch current with `main`** — only if something
landed on `main` mid-feature (usually a docs commit via the escape
hatch below). Do this before further task work and before landing:

```bash
git fetch origin main            # if applicable
git rebase main
```

**Landing a feature (tier 2 -> tier 1, human-run)**:

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

```bash
cd ../<repo>
git worktree remove ../<repo>-<feature-name>
git branch -d feature/<feature-name>       # skip to keep raw scratch history around a while
```

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
