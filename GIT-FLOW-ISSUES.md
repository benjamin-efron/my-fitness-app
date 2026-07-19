# Git Flow Issues — Trace

Written 2026-07-19, at the close of the Exercise Calibration feature
(code-complete, QA loop test-driven end-to-end on one real bug, about
to land). Purpose: a faithful, evidence-based trace of every git/
harness-mechanics issue actually encountered running the Ralph loop by
hand across this feature — not a proposal, not a fix, just what
happened, so the dedicated git-flow-fixing session queued up after
this feature lands has a real record to work from instead of
reconstructing it from memory or `git log` archaeology. Ad hoc for now
— no fixed home or format; `BACKLOG.md` has a pointer to this file and
a note that it needs a real, organized process once the backlog itself
gets a working-through pass, before the next feature starts.

Each section is one class of issue: what happened (with concrete
instances), how it was worked around in the moment, whether it
recurred, and the `BACKLOG.md` item that already tracks it, if any.
Nothing here is resolved by writing it down — resolving these is
exactly what the next session is for.

## 1. `EnterWorktree` fails intermittently for subagents

Recurring across the whole feature, worked around every time by
rooting the affected subagent's Read/Edit/Bash calls at the worktree's
absolute path instead of relying on session pinning:

- Task 6's coder (first occurrence).
- Task 9's coder (second).
- This session alone, three more: the `diagnosis` subagent (finding 2),
  the `coder` subagent (finding-2 bugfix), and the `reviewer` subagent
  (finding-2 bugfix review) — i.e. **every subagent launched this
  session hit it**, a much higher hit rate than the roughly 2-of-14
  prior invocations across the rest of the feature.

**Not yet noticed until writing this trace: the actual error text
differs between invocations, and may not be one bug.**

- Diagnosis and reviewer both got: *"current working directory ... is
  the repository root, not an isolated worktree — switching is only
  available to sessions whose working directory is inside a worktree
  of this repository."*
- The bugfix coder got a differently-worded error: *"Cannot enter
  worktree: ... is the current working directory."*

All three were reported by their subagents as "the known intermittent
`EnterWorktree` issue" and worked around the same way, but nothing
actually confirmed the two error strings share a root cause rather
than being two distinct failure modes that happen to produce the same
symptom (subagent not pinned, falls back to absolute paths). Worth
distinguishing properly before trying to fix anything.

**Update, found live during post-land cleanup (2026-07-19) — the
"Cannot enter worktree" variant has a reproducible trigger.** Calling
`EnterWorktree(path: <worktree path>)` from the driver's own session
failed with *"Cannot enter worktree: ... is the current working
directory"* — while the Bash tool's shell cwd (which persists across
Bash calls, per its own tool description) happened to already equal
that exact path, from an earlier raw `cd` run via Bash rather than
through `EnterWorktree` itself. Running a plain `cd` back to the repo
root first, then retrying `EnterWorktree(path: ...)` with no other
change, succeeded immediately. This matches the bugfix coder's earlier
error text exactly (see above), and is consistent with that subagent
having independently run its own `cd`/absolute-path Bash calls into
the worktree before its first `EnterWorktree` attempt (per its own
"Before you start" instructions being followed loosely, or a prior
failed attempt leaving its shell mid-directory). Still doesn't explain
the *other* error variant ("is the repository root, not an isolated
worktree" — the opposite condition, cwd NOT already at the target) —
but this is a real, reproducible trigger for one of the two, not
random flakiness. Worth checking whether `EnterWorktree` could detect
and self-correct this case (cwd already at the target path via a means
other than the tool itself) rather than erroring.

**Backlog:** `EnterWorktree fails intermittently for subagents` item.

## 2. Docs-only commits landing inside a unit-of-work's boundary — recurring "chore commit gap"

The tier model assumes a clean run: boundary tag, then only that
unit's own scratch commits, then its review tag. In practice something
legitimate and docs-only almost always lands in between, and there's
no fixed convention for handling it — every occurrence has been
improvised fresh:

- Task 4→5 boundary: a stray `plan.md`-insertion commit.
- Task 5's compaction: a trailing comment-sweep chore commit landed
  after the review tag but before compaction.
- Task 8's insertion: renumbering old tasks 8-13 to 9-14 as its own
  docs commit, ahead of Task 9's own work starting.
- Task 9's compaction: moved `task/8-done` forward past two docs-only
  commits (spec-directory rename) that landed between the boundary and
  Task 9's own scratch commits.
- **Finding-2 bugfix compaction, today — the largest gap yet.**
  Thirteen commits sat between `task/14-done` and the bugfix's own
  first scratch commit: the entire QA-loop/diagnosis-subagent/
  ralph-loop-split setup, plus three of my own live backlog commits
  added mid-session at breakpoints. Resolved the same way as task 9 —
  moved `task/14-done` forward to right before the bugfix's own work
  — but at meaningfully larger scale, and for the first time mixing in
  commits made *by the driver during a live breakpoint*, not just
  agent-authored docs commits.

The workaround (move the boundary tag forward, cherry-pick anything
that must stay separate) works every time it's been tried, but it's
never been written down as an actual procedure — it's re-derived from
first principles at each occurrence.

**Backlog:** `No escape hatch for cross-cutting chore commits` item.

## 3. Compaction is fully manual, hand-run shell commands with no verification built in — two new operator mistakes today

Compacting the finding-2 bugfix (see `ralph-git`'s tier 3 -> tier 2
procedure) surfaced two mistakes, both mine, both caught only because
I happened to check `git status`/`git show --stat` after each step
before moving on — nothing in the process would have caught either
automatically:

- **Mistake A — accidental combined commit.** After staging the
  bugfix's four files, I ran a *separate* `git add
  specs/.../qa-findings.md && git commit -m "..."` intending to commit
  only that one file. `git commit -m` with no pathspec commits
  *everything currently staged*, not just the newly-`add`ed path — so
  it swept the bugfix's own files in under the wrong commit message.
  Caught immediately via `git show --stat HEAD`; fixed with `git reset
  --soft HEAD^` (safe — the bad commit was local-only, untagged, one
  step old) and redone with `git commit -m "..." -- <path>` to scope
  each commit explicitly by pathspec instead of relying on whatever
  happened to be staged.
- **Mistake B — cherry-pick left a stuck sequencer state.**
  `git cherry-pick f7ee01f 447917a 113ad6c` (three commits in one
  call) failed applying the first commit because of an uncommitted
  working-tree conflict on `BACKLOG.md` (leftover local edits that
  duplicated what the commits themselves would apply). The failure
  message looked like a clean abort ("fatal: cherry-pick failed"), but
  it wasn't — a retry hit "cherry-pick is already in progress" instead
  of actually retrying, because the earlier attempt had left sequencer
  state behind. Required an explicit `git cherry-pick --abort` before
  anything else would work; then redone one commit at a time, which
  succeeded cleanly for all three.

Both were caught before anything shipped, and final state was verified
against a manually-created safety branch
(`backup/pre-bugfix-compact-stale-hide-calibrated-filter`, still
present — not deleted, per the "clean up after the feature lands, not
before" convention) — diffed content byte-for-byte, not just trusted.
But the fact that *verifying by hand after every step* is the only
thing standing between a mistake and a corrupted feature-branch history
is itself the finding. There's no dry-run, no scripted compaction
step, nothing that would have caught either mistake automatically.

Also worth noting: creating the safety backup branch before attempting
the surgery was my own ad hoc judgment call, not an established
convention — nothing currently says when a compaction is "risky
enough" to warrant one versus not.

**Backlog:** not yet filed as its own item — closely related to the
chore-commit-gap item above (#2), but distinct: that one is about
*whose* commits end up where; this one is about the mechanical
safety of the compaction operation itself, regardless of whose commits
are involved.

## 4. Reviewer subagent ran a destructive git command with no harness-level guard

Separate incident, same session (finding-2 bugfix review): the
`reviewer` subagent — whose entire job is investigation plus writes to
exactly two designated output files — ran `git checkout <rev> -- .`
without checking `git status` first, while comparing output across
revisions. Briefly clobbered three uncommitted files and reverted two
`BACKLOG.md` entries. Self-corrected via `git fsck`/reflog, reported
the incident transparently; the driver independently verified full
recovery (byte-identical content).

`reviewer.md` already states in prose that it may only touch its two
output files. Bash access is unrestricted, so nothing actually stops
it from running arbitrary destructive git commands — the prose
convention is the only thing that failed softly here instead of
silently.

A first, unverified pass at what's actually configurable in this
harness (tool-level restriction via agent frontmatter, `settings.json`
Bash allow/deny globs, `PreToolUse` hooks that can inspect command
content) is captured in `BACKLOG.md`'s entry for this — flagged there
as researched-but-not-confirmed-against-current-docs, not settled.

**Backlog:** `Reviewer ... have no enforced boundary against
destructive writes` item.

## 5. Custom subagent definitions only exist on the feature branch, not on `main` — every subagent this session needed a workaround to invoke at all

The root checkout's `.claude/agents/` has only the old `coder.md`/
`reviewer.md` (no bug-fix generalization, no `diagnosis.md` at all) —
because the QA-loop tooling itself is part of this unlanded feature.
The `Agent` tool's `subagent_type` registry resolves from the main
checkout, not the worktree, so none of the custom agent types actually
needed this session (`diagnosis`, the bug-fix-aware `coder`/
`reviewer`) were invokable by name — `subagent_type: "diagnosis"`
simply isn't in the list. Every subagent this session had to be
launched as `general-purpose`, with the target agent doc's absolute
path embedded in the prompt and explicit instructions to read and
follow it as its actual operating instructions.

This isn't a bug in the sense of unexpected behavior — it's a direct,
structural consequence of custom subagent types being resolved once,
from the main checkout, rather than per-worktree. Landing this feature
resolves it for *these* agents, but the same gap will recur for any
future harness-improvement work done on a feature branch before that
branch lands — anything that adds or changes a `.claude/agents/*.md`
file becomes invisible to the `Agent` tool's registry until landed.

**Backlog:** not yet filed. Related to, but distinct from, the
"landing docs-only commits on `main` independently" item — that one is
about commit/tag mechanics; this one is about a harness capability
(agent-type registration) that doesn't follow worktree boundaries at
all.

## 6. `main` is missing fixes that only exist on the feature branch — concretely blocked manual QA today

The `metro.config.js` test-file `blockList` fix (originally folded
into `task/7-done`, fixing a real on-device bundling crash from
co-located `*.test.tsx` files under `src/app/`) never landed on `main`
independently — it only exists on the feature branch. This wasn't just
a documented gap; it concretely blocked the user today, who hit the
identical bundling crash trying to launch `main` in Expo Go to
manually validate the finding-2 fix, and had to test from the feature
worktree instead. Ties to `main`'s broader unpushed-commit drift (20+
local commits ahead of `origin/main` as of this feature, no push
cadence ever decided) and to the "landing docs-only commits on `main`
independently, mid-feature" item — both are instances of the same
underlying question: what's `main`'s own update cadence, independent
of whichever feature branch happens to be active.

**Backlog:** `No strategy for "out-of-band" bugs discovered outside
any task's scope` item (has a 2026-07-19 update recording this).

## 7. Rebase invalidates tags; repointing is manual

Documented and exercised for real once this feature (task 9's rebase
onto `main`): rebasing rewrites every commit's SHA on the feature
branch, but `task/N-*`/`bugfix/<slug>-*` tags still point at the old,
now-orphaned pre-rebase commits — git does not move them (unlike
`--update-refs`, which only tracks branches, not tags). Repointing is
entirely by hand: match each old tag to its new commit by message
(messages survive a rebase; SHAs don't), then `git tag -f` each one.

Not an incident this session — no rebase happened here — but directly
relevant to landing (the very next step), which requires exactly this
rebase (`git rebase main` on the feature branch before the final
`reset --soft main`). A tag left stale here wouldn't error; it would
just silently point at the wrong commit until something tried to use
it.

## 8. A no-op rebase produced a real conflict, because of an embedded merge commit

Landing this feature (see `ralph-git`'s "Landing a feature" procedure)
starts with `git rebase main` on the feature branch. Before running
it, `main..HEAD`/`HEAD..main` checks showed the feature branch already
fully contains `main` (`main`'s tip is a confirmed ancestor of `HEAD`
via `git merge-base --is-ancestor`) — meaning the rebase should have
been a pure no-op. It wasn't: `git rebase main` hit a real content
conflict in `BACKLOG.md`, 15 commits into replaying 32.

Root cause, after aborting and investigating rather than resolving
blind: this branch has an embedded merge commit
(`893255b Merge branch 'main' into worktree-feature+exercise-calibration`,
from an earlier point in the feature's life — see the "Spec directory
renamed" note in the feature's own history). A standard `git rebase`
(no `--rebase-merges`/`-r`) doesn't preserve merge commits — it
flattens history and replays every commit as an independent linear
patch, including content that originally arrived through that merge's
non-first-parent side. Replaying that content again, as a fresh patch
against a base that already has it (because `main` had already
incorporated it by a different path), is what produced the conflict —
not any actual divergence between the branch and `main`.

Resolution: skipped the rebase entirely. Since `main` was already a
confirmed ancestor of `HEAD`, `git reset --soft main` (the next
landing step) works correctly without it — the rebase step only
exists to pull in new upstream commits, and there were none to pull
in. Would not have been obvious without explicitly checking
`is-ancestor` first rather than trusting `git rebase`'s exit behavior;
worth deciding whether the landing procedure should check this
up front (skip the rebase when already an ancestor) or always use
`--rebase-merges` to sidestep the flattening issue generally, for
whenever there genuinely is new upstream work to pull in on a branch
that also contains a merge commit.

## What this trace doesn't cover

Not attempting completeness on process gaps that are already
well-documented as design questions rather than concrete incidents —
`BACKLOG.md`'s "Also worth deciding before iterating" section has
several (no formalized mid-feature spec/plan update process, no
formal review-checkpoint-by-bug-class process, etc.). This trace is
scoped to things that actually *happened* — a command failed, a file
got clobbered, a tag went stale — not to open design questions that
haven't yet produced a concrete incident.
