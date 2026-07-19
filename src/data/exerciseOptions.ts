import type { Exercise } from './exercises';

/**
 * Every distinct muscle group appearing across all entries'
 * `primaryMuscles` and `secondaryMuscles`, deduplicated. Used to
 * populate the list screen's muscle-group filter straight from the
 * loaded data instead of a hand-maintained list.
 */
export function getMuscleGroupOptions(exercises: Exercise[]): string[] {
  const options = new Set<string>();

  for (const exercise of exercises) {
    for (const muscle of exercise.primaryMuscles) {
      options.add(muscle);
    }
    for (const muscle of exercise.secondaryMuscles) {
      options.add(muscle);
    }
  }

  return Array.from(options);
}

/**
 * Every distinct equipment value appearing across all entries'
 * `equipment`, deduplicated. Used to populate the list screen's
 * equipment filter.
 */
export function getEquipmentOptions(exercises: Exercise[]): string[] {
  const options = new Set<string>();

  for (const exercise of exercises) {
    for (const equipment of exercise.equipment) {
      options.add(equipment);
    }
  }

  return Array.from(options);
}
