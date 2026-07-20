---
name: engineering-log
description: Append a structured entry to a feature's cumulative engineering log at specs/<feature>/engineering-log.md — the durable, human-facing record of implementation decisions, conventions, debt, and judgment calls that a fleet of narrow-context coder/reviewer agents surfaces but no single agent holds a persistent view of. Use after finishing coder or reviewer work on a task, to append one or more entries via the bundled script. Never use it to read or edit existing entries.
---

# Engineering Log

A system of small, focused, fresh-context agents is powerful exactly
because no single agent carries the whole picture of the app — but
that means nothing in the loop holds a persistent, cross-task view of
it either, unless something is built to hold it deliberately. This log
is that something. It exists for the human supervising the loop, not
for agents to read back — an append-only, feature-scoped record of
what got decided, introduced, deferred, or discovered along the way,
thin enough to actually get read, unlike re-deriving the same picture
from a full diff or the raw git log.

## What goes in it

Not every task produces an entry — a task simply meeting its
acceptance criteria is exactly what the reviewer's own
`specs/<feature>/reviewer/task-N.md` already covers, and doesn't
belong here too. Log something only when it's the kind of thing a
technical
manager would want surfaced to them directly, not re-derived by
reading the code:

- A new external dependency, and why.
- A new convention or reusable pattern introduced (a styling approach,
  a comment tag, a way of deriving one type from another) that later
  tasks are now expected to already know about.
- A data-model or storage-schema decision — anything expensive to
  change once something else is built on top of it.
- Deferred or incomplete work — a known compromise, not a bug.
- A judgment call made under spec ambiguity that the next task
  inherits.
- A change that touches more than this task's own scope — shared
  styling, a shared component, anything with blast radius beyond one
  file.
- A scale or performance finding tied to real data, likely to recur
  elsewhere in the app.
- A gap found in the spec document itself, distinct from an ordinary
  judgment call — the spec was silently wrong or incomplete, not just
  underspecified in an expected way.

## How to append

```bash
.claude/skills/engineering-log/append.sh \
  --feature <specs/ directory name, e.g. 20260705-exercise-calibration> \
  --task <task number> \
  --role coder|reviewer \
  --summary "<one line, what happened>" \
  [--type <short tag from the list above, freeform>] \
  [--detail "<longer note, only if the one-liner isn't enough>"]
```

Creates `specs/<feature>/engineering-log.md` on first use, with a
header explaining what the file is. Appends only — never rewrites or
removes an existing entry, regardless of what else is going on in the
task.

## Do not read the log before writing to it

The coder and reviewer both run this pass independently, without
reading what the other (or an earlier task) already wrote. If the same
point lands twice, that means the point is more important, not that
effort was duplicated — filtering that out at write time would
suppress exactly the signal this exists to surface. Reading the log
before writing to it would also anchor each pass on what's already
there instead of an honest independent read of the task just
finished.
