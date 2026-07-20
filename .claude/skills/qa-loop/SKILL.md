---
name: qa-loop
description: The human-review loop a feature goes through after it's code-complete (every plan.md task landed on the feature branch) and before it lands on main — capture raw QA findings, triage each into a bug or a design change, diagnose every bug before fixing any of them, then fix them one after another through the normal coder/reviewer cycle. More interactive than the Ralph task loop: the driver (orchestrating session), not a subagent, does the triage. One phase of `ralph-loop`'s overall state machine — see that skill for how this fits with the rest of a feature's life. Use right after a feature's last task lands, when the user is about to do manual/ad-hoc testing and report what they find.
---

# QA Loop

Unlike the Ralph task loop — spec written up front, then coder/
reviewer iterate task by task with the driver mostly out of the way —
this loop starts from unstructured human observation, not a
pre-written acceptance criterion. It needs the driver more involved,
at least through triage.

## When this runs

After a feature's task list is code-complete on its feature branch
(the last `task/N-done` tag is set) and before "Landing a feature" in
`ralph-git`. The user does manual/ad-hoc testing in Expo Go and
reports what they find, in whatever form is easiest for them —
screenshots, rough notes, a list typed in chat. Don't ask them to
formalize it themselves; that's this loop's job.

## Step 1 — Capture

Write every finding into `specs/<feature>/driver/qa-findings.md`, created if
it doesn't exist yet, faithfully — repro steps as described, observed
vs. expected behavior, nothing smoothed over or summarized away. Do
not propose fixes, assign severity, or categorize at this step; that's
Step 2. If a detail is fuzzy (the user didn't track exact steps),
record it as fuzzy rather than inventing precision that wasn't there.

## Step 2 — Triage (the driver's call, not a subagent's)

Read each finding and sort it into exactly one of:

- **Bug** — a reproducible defect against documented or reasonably
  expected behavior. Proceeds to Step 3.
- **Design change** — a UX/interaction request that isn't a defect
  against any spec'd behavior (nothing documented promised the old
  behavior was right). Append it to this feature's `specs/<feature>/
  backlog.md` directly yourself — no subagent needed — creating the
  file if it doesn't exist yet, under whatever section fits, and
  cross-reference it with a one-line Status update in
  `qa-findings.md` (`**Status:** Design change — see backlog.md's
  "<item>".`). Only use the repo-root `BACKLOG.md` instead if the item
  needs to land on `main` independently of this feature — an
  out-of-band bug unrelated to what's being built, not a polish item
  on the feature itself (`specs/README.md`).
- **Already tracked** — duplicates an existing item in this feature's
  `backlog.md` (or the repo-root `BACKLOG.md`, for an out-of-band
  item). Cross-reference it the same way; don't create a new entry.

**Open question, not yet resolved:** some design changes plausibly
need to land *before* the feature ships rather than always deferring
to the backlog for a later session — e.g. an interaction bad enough
that shipping it as-is undercuts the feature. Nothing here decides
that yet; when it comes up, flag it explicitly to the user rather than
defaulting to "always defer" or "always fix now." See `BACKLOG.md`'s
item on landing design changes before a feature ships.

## Step 3 — Diagnose every bug from this pass, one at a time, before fixing any

For each finding triaged as a bug, spawn the `diagnosis` subagent
(`.claude/agents/diagnosis.md`, following the `bug-diagnosis` skill)
with the worktree path and the finding to investigate. It writes an
evidence-backed diagnosis to `specs/<feature>/diagnosis/<slug>.md` and
updates that finding's Status line — see `diagnosis.md` for exactly
what it may touch. It does not fix anything.

Run these sequentially, not in parallel, and don't start Step 4 for
any of them until every bug from this pass has a diagnosis doc. Bugs
found in the same pass may be related — fixing one could change
another's behavior — and diagnosing everything first, before any
fixing starts, is today's mitigation for that. It's partial, not a
full solution: nothing here actually cross-checks diagnoses against
each other for overlap yet (see `BACKLOG.md`'s "Surfacing
interdependencies between bugs" item for where this needs to go next).
With only one bug diagnosed at a time so far, this hasn't been tested
against a real multi-bug pass.

## Step 4 — Fix, one bug after another

Once every bug from this pass is diagnosed, fix them in sequence — the
same coder/reviewer cycle `ralph-loop`'s Stage 2 uses for a `plan.md`
task, just tagged `bugfix/<slug>` instead of `task/N` (`ralph-git`).

The diagnosis doc (`specs/<feature>/diagnosis/<slug>.md`) is the
coder's and reviewer's spec for this fix — no separate change-spec or
fix-plan doc right now:

- **Coder** reads the diagnosis (especially In-Depth Explanation and
  Validations), implements the fix, writes the "Suggested tests" from
  Validations as real red-before-green tests per `testing` (free to
  add more beyond what's suggested), then tags `bugfix/<slug>-review`
  and updates the diagnosis doc's Handoff line — same discipline as a
  `plan.md` task's one-line touch, see `ralph-git`.
- **Reviewer** reviews `bugfix/<slug>-review` the same way it reviews
  a task, against the diagnosis doc instead of `plan.md` — including
  checking the diagnosis's "Human validation" description actually
  holds.
- On approval, driver spawns `readability` and `architecture` against
  the same review tag, same as a `plan.md` task — including the
  readability sign-off stop before anything acts on its findings
  (`ralph-loop` Stage 2 step 5).
- Driver compacts tier 3 -> tier 2 as usual, tags `bugfix/<slug>-done`.

This is intentionally the simplest version that works: one diagnosis
doc, no interactivity in the coding itself (only triage and diagnosis
are interactive). Expect this to grow — see `BACKLOG.md`'s
"intermediate draft doc" item — once a pass is regularly producing
more than one bug at a time.
