import rawExercises from '@data/exercises.json';

export type Exercise = {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
};

/**
 * Returns the static exercise database, typed as `Exercise[]`.
 *
 * `data/exercises.json` is bundled read-only reference data (not
 * AsyncStorage) — see specs/20260705-exercise-calibration/spec.md.
 */
export function loadExercises(): Exercise[] {
  return rawExercises as Exercise[];
}
