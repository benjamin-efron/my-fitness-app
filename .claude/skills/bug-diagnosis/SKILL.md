---
name: bug-diagnosis
description: Evidence discipline and a strict eight-section template (Bug Description, Hypothesis, In-Depth Explanation, Evidence, Unknowns, Confidence Level, Validations, Unrelated Findings) for investigating one reported bug without tunneling onto an unrelated finding. Concrete evidence only — code snippets with file:line citations, test/command output — never a claim without a source. Validations splits into human-facing confirmation and coder-facing suggested tests. Reproducing the bug by actually running the app is out of scope for now. Use when investigating a QA finding already triaged as a bug (see `qa-loop`), most directly by the `diagnosis` subagent.
---

# Bug Diagnosis

A diagnosis is not "I found something that looks wrong." It's a
written case: *this specific symptom happens because of this specific
code, and here's how I know.* Fill in the template below as you go —
section by section, in order — so the reasoning builds up on the page
the same way it should build up in your head: symptom, then a
plain-language read on the cause, then the trace that earns it, then
the receipts, then what's still unresolved, then how much to trust all
of it.

## Why this exists

Agentic bug investigation has a specific failure mode: given an
open-ended "something's wrong here" prompt, an agent finds *something*
questionable in the code — a stale-looking comment, a slightly odd
conditional, an unrelated TODO — and writes it up as the cause because
it's concrete and it's *there*, not because it explains the reported
symptom. It reads confidently. It's often about the wrong thing. The
template below exists to make that failure mode structurally harder to
fall into: every section either has to cite something concrete or
admit it can't.

## The template

Every diagnosis is one file with exactly these eight sections, in this
order. Don't add sections, don't skip one — if a section is genuinely
empty (e.g. no red herrings were seriously considered), say so briefly
rather than dropping the heading, so a reader can tell "nothing here"
from "forgot to fill this in."

### Bug Description

Two to four sentences. What happens, when, and how it differs from
expected behavior — pulled from the QA finding's actual repro steps,
not a vague restatement. Someone reading only this section should know
exactly what bug is being discussed.

### Hypothesis

Two to four sentences, plain language: what causes the bug. This is
the section other agents (or you, later) read first to get oriented
before the deep trace — write it last, after the evidence is in, even
though it's positioned first for the reader. Don't hedge with a list
of maybes; state the best-supported explanation directly, or write
`Inconclusive` if the evidence never converged on one. Forming an
early guess while investigating is normal — the discipline is not
letting that early guess become this section's answer just because it
was first. If the evidence changed your mind partway through, this
section reflects where you landed, not where you started.

### In-Depth Explanation

The trace. Walk from the reported symptom to its cause, step by step,
through the actual code — this is where the reasoning gets earned, not
just asserted. Call out anything confusing or non-obvious explicitly
rather than gliding past it; if something took real effort to
understand, that's worth a sentence here. Include the evidence that's
essential to following the argument — inline snippets with `file:line`
where the reasoning turns on them — but not everything gathered; the
exhaustive catalog belongs in Evidence, not here. If a step in the
trace is inferred rather than directly observed, say so in the
sentence itself, not only via the Evidence section's labeling.

### Evidence

Every piece of evidence gathered, cataloged — whether or not it made
it into the explanation above. Concrete only: a code snippet with a
`file:line` citation, or a command's actual output, never a
restatement without a source. Label each item:

- **Observed** — read or run directly: a code excerpt, a test's actual
  pass/fail output, a `git log`/`git blame` result. Quote it verbatim
  in a fenced block, with the file path and line numbers or the exact
  command run.
- **Inferred** — reasoned from observed items without directly
  witnessing it. Say which observed items it's reasoned from and how.

There's currently no tooling to drive the app and capture runtime
output (see "What evidence is available" below) — expect this section
to lean on code and test/git evidence rather than logs or screenshots
until that exists.

### Unknowns

Open questions the evidence couldn't resolve — because a tool wasn't
available (most commonly: can't watch the app run live) or because the
investigation genuinely couldn't pin it down after real effort. State
each plainly. Don't give up on the first hard question, but also don't
round an unresolved gap up to a confident answer just to avoid an
empty-looking section — reporting "I don't know, and here's
specifically what I'd need to find out" is a better outcome than a
diagnosis that's wrong.

### Confidence Level

How much to trust this diagnosis, and why. A clear-cut bug with direct
observed evidence covering the whole causal chain can get one or two
sentences here. The more confusing the bug, or the lower the
confidence, the more this section should say — what would raise
confidence, which specific link in the chain is shakiest, whether the
Unknowns above are minor gaps or ones that could overturn the
Hypothesis entirely.

### Validations

Two parts. Neither needs to be exhaustive — the coder has room to add
more as the fix takes shape — but both need to be concrete enough to
act on without guessing.

**Human validation.** A brief description of the working behavior:
what a person should see in the app once this is fixed, framed against
the original repro steps in Bug Description so it's obviously the same
scenario, now behaving correctly. Step-by-step instructions are
welcome if they help, but not required — a clear description of the
correct end state is enough on its own.

**Suggested tests.** Point-level test scenarios aimed at the root
cause identified above — not a full test plan, just the specific cases
this diagnosis's evidence says need coverage. For each: which existing
test file it belongs in (per `testing`'s co-location convention, e.g.
`src/app/index.tsx` -> `src/app/index.test.tsx`) or whether it needs a
new one, and the behavior it should assert, stated as a test
description the way `testing` requires (e.g. `clamps effort rating
above 5 down to 5`) — not the test code itself; writing it, red before
green, is the coder's job per `testing`.

If Hypothesis is `Inconclusive`, Human validation can still describe
the correct end state from Bug Description alone, but Suggested tests
may have little to point at without a known cause — say so rather than
inventing test cases the evidence doesn't support.

### Unrelated Findings

Red herrings, specifically — things that genuinely caught your
attention as a possible cause, got investigated seriously, and were
then ruled out. This is not a catalog of every stray code smell
noticed along the way; if something was never seriously considered as
a candidate explanation for *this* symptom, it doesn't belong here —
mention it to the driver separately instead of growing this section
into a general code-quality note. If nothing was seriously chased and
ruled out, just say "none."

## What evidence is available right now

No tooling exists yet to actually run the app and observe it live —
diagnosis works from code reading, the existing test suite, and git
history (`git log`/`git blame`). When the causal chain can only be
closed by watching the app run, that's a legitimate Unknown, not a gap
to guess past (see `BACKLOG.md`'s "bug reproduction flow design" item
for the actual reproduction-tooling gap this points at).

## Handoff line

Leave one line under the finding pointer, `**Handoff:** _pending_` —
this is the fix's equivalent of `plan.md`'s per-task handoff line (see
`ralph-git`): the coder fixing this bug updates it to point at the
`bugfix/<slug>-review` tag, then the driver repoints it to
`bugfix/<slug>-done` once the fix is compacted. It's not yours to fill
in beyond leaving it present — you're diagnosing, not fixing.

## Full template

`````markdown
# Diagnosis: <slug>

**Finding:** specs/<feature>/driver/qa-findings.md, finding <N>
**Handoff:** _pending_

## Bug Description

## Hypothesis

## In-Depth Explanation

## Evidence

1. **Observed** — `path/to/file.ts:12-18`
   ```ts
   ...
   ```

## Unknowns

## Confidence Level

## Validations

**Human validation:**

**Suggested tests:**

## Unrelated Findings
`````
