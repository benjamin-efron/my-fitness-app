---
name: testing
description: Unit and component testing conventions for this Expo/React Native app — Jest with the jest-expo preset, React Native Testing Library for component tests, co-located test files, and a red-before-green (failing test committed before the implementation that passes it) discipline that ties into ralph-git's task-scratch commits. Bans snapshot tests and coverage-percentage gates as gameable. Use when writing or reviewing any test in this repo, or when deciding whether a change is verified enough to hand off to the reviewer subagent.
---

# Testing

The verification gate for this project has to survive an agent that
is, deliberately or not, motivated to make it pass rather than to make
the code correct. "Tests pass" is not evidence on its own — a test can
assert on a mock instead of real behavior, or be weakened until it's
green. Every rule below exists to close one of those gaps.

## Hard rules

- **IMPORTANT: red before green.** Write and commit the failing test
  before writing the implementation that makes it pass — two separate
  task-scratch commits minimum (see `ralph-git`):
  ```
  wip(task-3): test — calibration effort clamps to 1-5, currently failing
  wip(task-3): impl — clamp effort rating, test now passes
  ```
  A test written *after* the implementation can be made to pass by
  construction and proves nothing. This pair is the actual evidence a
  test exercises the change; the reviewer subagent checks for it in
  the task-scratch history, not just a green suite at the final commit.
- **IMPORTANT: run the full gate, every task, before handoff to
  review.** None of the three commands below substitutes for another
  — typecheck and lint catch classes of bugs tests don't, and vice
  versa.
- **No snapshot tests.** `toMatchSnapshot()` passes trivially on first
  run and gets blindly re-recorded the moment it breaks — it never
  actually blocks a bad change. Write an explicit assertion instead.
- **No coverage-percentage gates.** Coverage rewards executing a line,
  not asserting an outcome — a test that touches every branch and
  asserts nothing reports 100% and verifies nothing.
- **Query by what a user perceives**, not implementation detail:
  `getByText`/`getByRole`/`getByLabelText`; `testID` only as a last
  resort. Never assert on internal state or props — that couples the
  test to implementation instead of behavior, which is exactly what
  makes a test easy to keep "passing" through a rewrite that breaks
  the feature.

## Tools & commands

- `npm test` — run the Jest suite.
- `npx tsc --noEmit` — typecheck.
- `npm run lint` — lint.

## Stack

- **Jest** (`jest-expo` preset) — test runner.
- **React Native Testing Library** (`@testing-library/react-native`,
  pinned to `13.3.3`) — component tests. Pinned because the current
  `14.x` line depends on an unstable `test-renderer` peer package;
  revisit once that stabilizes.

## Where tests live

Co-locate: `src/app/index.tsx` -> `src/app/index.test.tsx`. No
separate `__tests__` tree — a test's location should make it obvious
which file it verifies.

## What to test with which tool

- **Pure logic** (data transforms, calculations, storage
  serialization) — a plain Jest unit test, no rendering involved.
- **Screens and interactive components** — an RNTL component test:
  render it, query it, fire events, assert on what's visible or where
  navigation went.
