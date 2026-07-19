---
name: ralph-loop
description: The orchestrating driver's state machine for a feature end-to-end — spec, plan, the per-task coder/reviewer loop, the QA loop once code-complete (capture/triage/diagnose/fix), and landing. States, who acts in each (human/driver/coder/reviewer/diagnosis), and every off-ramp (spec wrong mid-task, missing shared infrastructure, a reviewer's non-blocking human-decision flag, docs landing on `main` mid-feature, a QA finding turning out to be a design change instead of a bug). Owns no capability itself — always points at the skill that does (`ralph-git` for git/tag mechanics, `testing` for the verification gate, `engineering-log` for logging, `qa-loop` for the QA sub-flow's detail, `bug-diagnosis` for the diagnosis method). Use to answer "what happens next" or "whose call is this" at any point in a feature's life, from a blank `specs/` directory through a squash-merge onto `main`.
---

# Ralph Loop

This is the map, not the territory: every state below names the skill
or agent doc that actually knows how to execute it. If a step here
ever disagrees with the skill it points at, the skill is right —
update this file rather than trusting stale prose. Nothing here is a
git command, a file format, or a tool call; those all live one level
down, in the skills this one references.

## Roles

| Role | Does |
|---|---|
| Human (you) | Agrees `spec.md` before task work starts; does manual QA testing; resolves anything flagged "Needs human decision"; runs the final `checkout main && merge --ff-only` |
| Driver (orchestrating session) | Everything else that isn't a subagent's job: creates the worktree, picks the next task/bug, spawns `coder`/`reviewer`/`diagnosis`, compacts tier 3 -> tier 2, triages QA findings, keeps the branch current with `main`, prepares the landing squash |
| `coder` subagent | Implements exactly one task or one bug fix, red-before-green, tags for review |
| `reviewer` subagent | Reviews exactly one task's or bug fix's diff, verdict: approve / request changes / (separately) needs human decision |
| `diagnosis` subagent | Investigates exactly one QA-triaged bug, writes the eight-section diagnosis doc, never fixes anything |

## Stage 1 — Spec and plan

Write `spec.md` with the human, agreed before any task work starts;
then `plan.md`, the feature broken into sequential tasks (see
`specs/README.md` for what each must contain). Create the feature's
worktree (`ralph-git`'s "Starting a feature's worktree").

**Off-ramp:** if task work later reveals the spec was wrong or
incomplete, the coder stops and flags it rather than quietly
redefining scope (`coder.md`) — the spec gets updated deliberately, as
its own agent-docs commit (`ralph-git`'s escape hatch), before task
work resumes (`specs/README.md`, "Changing a spec mid-feature").

## Stage 2 — Task loop (per task, sequential)

For each `plan.md` task, in order:

1. Driver spawns `coder` with the task.
2. Coder implements it, tags `task/N-review` (`ralph-git`).
3. Driver spawns `reviewer` against that tag.
4. **Approve** -> driver compacts tier 3 -> tier 2 (`ralph-git`:
   `reset --soft`, fold `engineering-log.md`, tag `task/N-done`).
   **Request changes** -> back to step 1, same coder invocation
   continues, same review tag moves forward, not a new one.
   **Needs human decision** (can accompany either verdict) -> doesn't
   block this task's compaction; carries forward as an open item
   resolved at Stage 4's landing gate, not here (`reviewer.md`).
5. Repeat until every `plan.md` task is `task/N-done`. The feature is
   now **code-complete** — proceed to Stage 3.

**Off-ramps:**
- **Missing shared infrastructure** a task assumes exists — the coder
  builds the smallest placeholder, tags it `PLACEHOLDER`, notes it in
  `BACKLOG.md`, and continues; this doesn't stop the loop (`coder.md`).
- **A docs commit lands on `main` mid-feature** (via the escape hatch,
  proactively or discovered) — before further task work, rebase the
  feature branch onto `main` and re-point every tag (`ralph-git`,
  "Keeping the feature branch current with `main`").
- **An out-of-band bug found by manual validation mid-loop**, outside
  any task's acceptance criteria — no settled process yet; see
  `BACKLOG.md`'s "No strategy for 'out-of-band' bugs" item. Distinct
  from a QA-loop bug (Stage 3), which is specifically post-code-
  complete.

## Stage 3 — QA loop (after code-complete, before landing)

Full detail lives in `qa-loop`; the shape of it:

1. Human does manual/ad-hoc testing, reports findings.
2. Driver captures them into `specs/<feature>/qa-findings.md`.
3. Driver triages each into **bug**, **design change**, or **already
   tracked**. Design changes and duplicates get cross-referenced into
   `BACKLOG.md` directly — no subagent needed.
4. For every finding triaged as a bug: driver spawns `diagnosis`, one
   at a time, sequentially — not in parallel — until every bug from
   this pass has a diagnosis doc. Only once all of them are diagnosed
   does fixing start, because a fix for one might change another's
   behavior; diagnosing everything first is today's (partial)
   mitigation for that, not a full solution — see `BACKLOG.md`'s
   "Surfacing interdependencies between bugs" item.
5. For every diagnosed bug, sequentially: run it through the same
   coder/reviewer cycle as Stage 2, tagged `bugfix/<slug>` instead of
   `task/N` (`ralph-git`). The diagnosis doc itself
   (`specs/<feature>/diagnoses/<slug>.md`) is currently the coder's and
   reviewer's spec — no separate change-spec or fix-plan doc yet (see
   `BACKLOG.md`'s "intermediate draft doc" item for where this might
   head next).

**Off-ramp:** a design change severe enough that shipping the feature
as-is undercuts it — no settled process for landing it before the
feature ships instead of deferring to `BACKLOG.md`; flag it to the
human explicitly in the moment rather than defaulting either way (see
`BACKLOG.md`'s "flow for landing design changes" item).

## Stage 4 — Landing (tier 2 -> tier 1, human-run)

Gate, before running `ralph-git`'s "Landing a feature":

1. Stage 3's QA loop has run and every bug it found is
   `bugfix/<slug>-done`.
2. Every `## Needs human decision` section across `.claude/review/*.md`
   is resolved — `grep -l '## Needs human decision' .claude/review/*.md`
   finds any still open. A landed feature shouldn't carry forward a
   decision nobody actually made.

Not yet part of this flow, tracked in `BACKLOG.md` rather than assumed
here: a whole-spec conformance pass re-reading `spec.md` end-to-end
before landing ("A whole-spec conformance pass before landing" item),
and a generated human testing plan distinct from ad hoc QA ("A human
testing plan, generated before landing" item).

Once the gate is clear, run `ralph-git`'s squash-and-merge sequence.

## Stage 5 — Cleanup

`ralph-git`'s worktree removal, once the human is done wanting the raw
scratch history around.
