# Specs

One directory per feature: `specs/<yyyymmdd>-<feature-name>/`, where
the date is when the spec was first written (not when the feature
ships) — this keeps directory listing order tracing the order
features were taken up, independent of how long each one runs.

This directory is the central, version-controlled record of every doc
generated or used while building the feature — not just the spec and
plan. It splits into two kinds of content:

- A small set of **top-level, shared docs** — not owned by any single
  agent, either because they're the feature's defining contract
  (`spec.md`, `plan.md`) or because multiple roles read or write them
  jointly (`backlog.md`, `engineering-log.md`).
- **Subdirectories scoped by the agent that wrote them** — one agent's
  own output, named after that agent. Any agent may read another's
  subdirectory freely (handoffs between agents depend on this — e.g.
  the coder reads `diagnosis/` for a bug fix); scoping is about who
  *writes* where, not who may read.

## Top-level docs

- **`spec.md`** — what the feature is and does. Written and agreed on
  with a human before any task work starts. The coder and reviewer
  check work against this, not against each other's account of it.
- **`plan.md`** — the feature broken into sequential tasks for the
  Ralph loop. One task per `coder` invocation (see
  `.claude/agents/coder.md`); the reviewer's diff range and the
  `task/N-review` tags in `.claude/skills/ralph-git/SKILL.md` refer to
  the task numbering here. Each task section keeps a single line for
  the coder to fill in on handoff (the review tag) — nothing else.
- **`backlog.md`** — this feature's own backlog: ideas, deferred
  polish, and out-of-scope findings discovered while building it, that
  don't need to land on `main` independently of it. The repo-root
  `BACKLOG.md` is reserved for items that do need to land on `main` on
  their own schedule (process/harness improvements, out-of-band bugs
  unrelated to this feature) — see `ralph-git`'s "Chore commits"
  section for the same distinction applied to code changes, not just
  backlog entries. Created on demand, not up front.
- **`engineering-log.md`** — cumulative, append-only record of
  decisions/conventions/debt/judgment-calls, written independently by
  both the coder and reviewer after every unit of work (see
  `.claude/skills/engineering-log/SKILL.md`). Top-level despite being
  agent-written because it's deliberately a joint record, not one
  agent's own output — the whole point is two independent passes
  landing in the same place.

## Agent-scoped subdirectories

- **`reviewer/`** — the reviewer subagent's own findings, one file per
  unit of work: `reviewer/task-<N>.md` for a `plan.md` task,
  `reviewer/bugfix-<slug>.md` for a bug fix, overwritten on a
  re-review (`.claude/agents/reviewer.md`). Filenames already key each
  review to a specific unit of work, so a coder reading its own
  feedback (or a later task reading review history) never has to guess
  which review belongs to which task.
- **`diagnosis/`** — the diagnosis subagent's evidence-backed
  write-ups for QA-loop bugs, one file per bug:
  `diagnosis/<slug>.md` (`.claude/agents/diagnosis.md`, `bug-diagnosis`
  skill).
- **`readability/`** — the readability subagent's per-unit-of-work
  notes on comment/naming/organization clarity, one file per unit of
  work: `readability/task-<N>.md` / `readability/bugfix-<slug>.md`
  (`.claude/agents/readability.md`).
- **`architecture/`** — the architecture subagent's one evolving
  `findings.md`, updated (not just appended to) after every unit of
  work across the whole feature (`.claude/agents/architecture.md`).
- **`driver/`** — docs the orchestrating driver session itself
  produces, not any subagent: currently just `qa-findings.md`, the raw
  QA-loop capture (`qa-loop` skill). "Driver" gets its own scoped
  subdirectory the same as a subagent, even though it isn't one,
  because the naming convention (subdirectory = who wrote it) still
  applies.

Created on demand — a feature that never hits the QA loop has no
`diagnosis/`, one that never gets flagged by architecture has an empty
or absent `architecture/`.

## What `spec.md` must contain

- **User-facing behavior.** Walk through the screens/flows a person
  actually uses. Concrete enough that "did this match the spec" isn't
  a judgment call.
- **Data shape.** Any new AsyncStorage schema, static data file shape,
  or type the feature introduces or depends on.
- **Explicit non-goals.** What this feature deliberately does not do —
  usually work that reads as an obvious next step but belongs to a
  later feature. Keeps the coder from quietly expanding scope and the
  reviewer from flagging absence of something that was never in scope.
- **Open questions**, if any remain unresolved when a draft is first
  circulated — resolved before task work starts, not left for the
  coder to guess at.

## What `plan.md` must contain

- Tasks in build order, each with: what it covers, acceptance criteria
  concrete enough to write a failing test against, and the files it's
  expected to touch.
- A task should be small enough for one `coder` invocation — one red/
  green behavior pair, not a whole screen plus its storage layer plus
  its wiring into navigation.
- One line per task reserved for the coder's handoff pointer (review
  tag), per `ralph-git`.

## Changing a spec mid-feature

If task work reveals the spec was wrong or incomplete, the coder stops
and flags it (per `.claude/agents/coder.md`) rather than quietly
redefining scope — the spec gets updated deliberately, as its own
agent-docs commit (`ralph-git`'s escape hatch), before task work
resumes.

## Once a feature lands

A feature's `specs/<yyyymmdd>-<feature-name>/` directory is sealed the
moment its `main-landing/<spec-dir-name>` tag exists on `main`
(`ralph-git`'s landing procedure) — never edited again after that,
including pure reorganization with no content change. If a landed
feature needs revisiting later, write a new spec directory that
references the old one; don't go back and change it, even to fix a
stale cross-reference or improve its formatting. This keeps every
landed spec a faithful, unaltered record of what was actually agreed
and built at the time, rather than something that quietly drifts as
later sessions touch it for unrelated reasons.
