---
name: comment-guidelines
description: What makes a comment worth writing versus noise — default to none, javadoc-style conventions for public vs. internal functions, and treating a "needed" inline comment as a refactor smell rather than accepting and writing around it. Shared standard loaded by both the `coder` (writing code and comments) and `readability` (evaluating them) agents, so neither drifts from the other's expectations.
---

# Comment Guidelines

Well-named identifiers and a clear structure already say what code
does — a comment's only job is to carry what the code can't: the
*why*. This is the shared standard both the agent writing comments and
the agent judging them work from; if they diverged, `readability`
would be grading `coder` against a standard it was never told about.

## Default: no comment

Add one only when the why is genuinely non-obvious — a hidden
constraint, a workaround for a specific bug or platform limitation, a
tradeoff that would surprise a reader. If removing the comment
wouldn't confuse a future reader, don't write it. This applies whether
the reader is a human or a future fresh-context agent — assume neither
has any memory of the conversation that produced the code, only the
code itself.

## Never depend on process-internal jargon

A comment must stand on its own for a reader with zero idea what
development workflow or harness produced the code — no task numbers,
bugfix slugs, tag names, or any other scheduling/workflow bookkeeping.
That kind of reference is doubly bad: it's meaningless to an outside
reader on day one, and actively wrong once the referenced artifact
gets renumbered or superseded, which such artifacts routinely do. If a
comment needs to point somewhere durable for context, point at
`spec.md` by section name instead — it doesn't renumber. Product-level
"why do we support X but not Y" reasoning belongs in `spec.md`'s
Non-goals section, not code — that's rationale about the feature as a
whole, not one line of implementation. (This repo's specific process
vocabulary to avoid — task numbers, `task/N`/`bugfix/<slug>` tags — is
defined in `ralph-git`; the principle here is general.)

## Public API comments (javadoc-style)

Every function in a system's public API — the contract other files,
modules, or screens actually depend on — should carry a comment.
Focus it on:

- **Why**, not what — the code already says what; restating it adds
  nothing.
- **How it fits into the system it's exposing** — what depends on it,
  what it depends on, its role in the surrounding data/control flow —
  enough that a caller doesn't have to trace every call site to
  understand what they're relying on.

Keep it minimal when the case is simple: a one-liner is fine, even
preferable, when the name and signature already make the role obvious
— don't pad an already-clear contract with unnecessary prose. And keep
it focused on the *external* contract, not a restatement of what
happens inside the function body — that's the code's job.

## Internal function comments

Same why-and-how-it-fits spirit applies to non-trivial internal
(non-public) functions, and it's worth doing — but it's a lower
priority than public API coverage. Where effort is scarce, the public
contract comes first.

## Inline comments: minimize, and treat as a smell

Inline comments — a note on a specific line or block inside a
function body — should be rare. Code should be readable on its own
through clear naming, small functions, and a flow that mirrors the
business logic it represents, not through prose threaded between the
lines. When something genuinely can't be made clear any other way —
an inherently non-obvious algorithm, a real platform quirk — write the
comment. But treat the *need* for one as a question before an answer:
often it's a sign the surrounding code — a function doing too much, a
name too generic to carry its own meaning, an abstraction that doesn't
actually match the business case it's modeling — needs a refactor more
than it needs a comment explaining around the problem. This is
specifically what the `readability` agent looks for
(`.claude/agents/readability.md`): a diff that's hard to trace, or
that leans on inline prose to stay followable, is a readability
finding in its own right, independent of whether the code is correct.

## Tagged comment forms

Two tags carry a specific ongoing obligation, not just informative
prose — `PLACEHOLDER` and `INVARIANT`. They're operational to this
repo's coder workflow (referencing `BACKLOG.md`, getting checked and
updated by later tasks); see `.claude/agents/coder.md`'s "Comment
hygiene" section for exactly when each applies. Don't invent further
tags for ordinary comments — a tag marks something that needs to be
found and resolved later; most comments are just prose and never need
that.
