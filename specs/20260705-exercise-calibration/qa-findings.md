# QA Findings — Exercise Calibration (pre-land human review)

Status: feature is code-complete (task 14 landed on the feature branch),
not yet landed on `main`. This is a first pass of manual/ad-hoc testing
by the user in Expo Go, done ahead of designing a repeatable pre-land
QA process — see `.claude/skills/qa-loop/` for the capture/triage/
diagnose flow these findings now follow. Findings 1 and 3 are triaged
(see their Status lines); finding 2 is triaged as a bug and awaiting
diagnosis.

## Finding 1 — Muscle group / equipment filter UI is hard to use

**Type:** UX / interaction design, not a correctness bug.

**Report:** The muscle group and equipment filters use a
horizontally-scrolling row of pills. Scrolling to find a pill and
tapping it is unintuitive — the interaction doesn't feel natural for
this kind of filtering.

**Expected:** A more intuitive filter UI. No specific alternative
design requested yet.

**Status:** Design change — see `BACKLOG.md`'s "More intuitive muscle
group / equipment filter UI, not horizontally-scrolling pills." item
under "## Exercise Calibration". No further action needed here; that
item owns it going forward.

## Finding 2 — "Hide calibrated" filter didn't apply immediately after calibrating an exercise

**Type:** Correctness bug — apparent stale UI state.

**Repro steps (as observed):**
1. On the exercise list, calibrate "Self-Assisted Inverse Leg Curl"
   (complete the calibration flow, save the result).
2. Return to the exercise list.
3. Toggle "Hide calibrated" on.
4. Observed: the exercise remained visible — the filter did not hide
   it, despite the calibration being saved (confirmed by reopening the
   calibration flow for that exercise, which showed the saved result).
5. Continued navigating the app further (exact steps not tracked). At
   some later point, the "Calibrated" pill appeared on that exercise's
   card, and the "Hide calibrated" filter then worked correctly.

**Expected:** Immediately after saving a calibration and returning to
the list, the exercise should show the "Calibrated" badge and be
hidden by "Hide calibrated" without extra navigation.

**Hypothesis (unverified):** the exercise list may not be re-reading
calibration state from storage when it regains focus / re-renders
after the calibration flow. Not investigated — cause of the later
self-correction is unknown too.

**Status:** Diagnosed — see `diagnoses/stale-hide-calibrated-filter.md`.

## Finding 3 — Muscle group names shown as raw identifiers, not human-readable labels

**Type:** Correctness / polish bug.

**Report:** Muscle group identifiers render raw instead of as
human-readable labels — e.g. the "upper back" muscle group displays as
`upper_back`.

**Status:** Already tracked. This duplicates the existing `BACKLOG.md`
item under "## Exercise Calibration": *"Human-readable muscle group
names."* That item already describes the fix (a `muscleGroupId ->`
display-label lookup used everywhere a muscle group is shown or
listed as a filter option). No new backlog entry needed — recorded
here only to confirm it was hit in manual testing.
