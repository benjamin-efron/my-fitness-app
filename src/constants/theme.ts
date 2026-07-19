/**
 * PLACEHOLDER — not a real design system. See `BACKLOG.md`'s
 * "Theming" section ("Real theme system") for the follow-up work
 * that replaces this file.
 *
 * CLAUDE.md points screens at "the existing theme system
 * (`src/constants/theme.ts`) for colors and typography", but no real
 * theme system has been built yet. This file is a minimal stand-in so
 * early screens have something to reference instead of hardcoding raw
 * colors in `StyleSheet.create` (see the coder agent's "Missing shared
 * infrastructure" convention in `.claude/agents/coder.md`).
 *
 * It covers only what Exercise Calibration's list screen
 * (`specs/20260705-exercise-calibration/spec.md`) needs: the primary/secondary
 * muscle highlight distinction, equipment text, the calibrated badge,
 * filter chip selection state, and card/page backgrounds. Do not
 * extend this into a full design system in place — replace it with
 * one, and remove this comment when you do.
 */

export const colors = {
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  text: '#1C1C1E',
  textMuted: '#6B6B70',
  primaryMuscle: {
    background: '#FFE1D6',
    text: '#C2410C',
  },
  secondaryMuscle: {
    background: '#EEEEF0',
    text: '#8A8A8E',
  },
  equipment: '#48484A',
  calibratedBadge: {
    background: '#D1FADF',
    text: '#067647',
  },
  filterChip: {
    background: '#E5E5EA',
    backgroundSelected: '#1C1C1E',
    text: '#3A3A3C',
    textSelected: '#FFFFFF',
  },
} as const;

export const typography = {
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
  },
} as const;
