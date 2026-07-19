import { loadExercises } from './exercises';

describe('loadExercises', () => {
  it('returns a non-empty list', () => {
    const exercises = loadExercises();

    expect(exercises.length).toBeGreaterThan(0);
  });

  it('gives every entry a non-empty id and name', () => {
    const exercises = loadExercises();

    for (const exercise of exercises) {
      expect(typeof exercise.id).toBe('string');
      expect(exercise.id.length).toBeGreaterThan(0);
      expect(typeof exercise.name).toBe('string');
      expect(exercise.name.length).toBeGreaterThan(0);
    }
  });
});
