import exercisesData from '@data/exercises.json';
import muscleGroupsData from '@data/muscle-groups.json';

import type { Exercise } from '@/types/exercise';

export const exercises: Exercise[] = exercisesData;

const muscleGroupLabels: Record<string, string> = Object.fromEntries(
  muscleGroupsData.groups.map((group) => [group.group, group.group_label])
);

export function muscleGroupLabel(slug: string): string {
  return muscleGroupLabels[slug] ?? slug;
}

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id);
}
