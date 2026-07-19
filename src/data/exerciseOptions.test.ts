import { getMuscleGroupOptions, getEquipmentOptions } from './exerciseOptions';
import type { Exercise } from './exercises';

const exercise = (overrides: Partial<Exercise>): Exercise => ({
  id: 'id',
  name: 'name',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  ...overrides,
});

describe('getMuscleGroupOptions', () => {
  it('dedupes a value appearing as both a primary muscle on one entry and a secondary muscle on another', () => {
    const exercises = [
      exercise({ primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] }),
      exercise({ primaryMuscles: ['back'], secondaryMuscles: ['chest'] }),
    ];

    const options = getMuscleGroupOptions(exercises);

    expect(options.filter((o) => o === 'chest')).toHaveLength(1);
    expect(options.sort()).toEqual(['back', 'chest', 'triceps'].sort());
  });

  it('returns an empty list when given an empty list', () => {
    expect(getMuscleGroupOptions([])).toEqual([]);
  });
});

describe('getEquipmentOptions', () => {
  it('dedupes an equipment value shared across multiple entries', () => {
    const exercises = [
      exercise({ equipment: ['barbell'] }),
      exercise({ equipment: ['barbell', 'bench'] }),
    ];

    const options = getEquipmentOptions(exercises);

    expect(options.filter((o) => o === 'barbell')).toHaveLength(1);
    expect(options.sort()).toEqual(['barbell', 'bench'].sort());
  });

  it('returns an empty list when given an empty list', () => {
    expect(getEquipmentOptions([])).toEqual([]);
  });
});
