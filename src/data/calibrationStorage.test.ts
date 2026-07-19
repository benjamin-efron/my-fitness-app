import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCalibration, getCalibration, isCalibrated } from './calibrationStorage';
import type { CalibrationResult } from './calibrationStorage';

// jest.mock calls are hoisted above imports by the babel-jest transform,
// so this runs before `./calibrationStorage` (and its AsyncStorage
// import) is evaluated despite the source-order position here.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const precise: CalibrationResult = {
  exerciseId: 'barbell-bench-press',
  repsCompleted: 8,
  weightUsed: 135,
  time: { kind: 'precise', seconds: 42 },
  effort: 4,
  notes: 'felt good',
  calibratedAt: '2020-01-01T00:00:00.000Z',
};

const approximate: CalibrationResult = {
  exerciseId: 'pull-up',
  repsCompleted: 10,
  weightUsed: 0,
  time: { kind: 'approximate', bucket: 'moderate' },
  effort: 5,
  notes: '',
  calibratedAt: '2020-01-01T00:00:00.000Z',
};

afterEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('saveCalibration / getCalibration', () => {
  it('round-trips a result with a precise time value', async () => {
    await saveCalibration(precise);

    const stored = await getCalibration(precise.exerciseId);

    expect(stored?.time).toEqual({ kind: 'precise', seconds: 42 });
    expect(stored?.repsCompleted).toBe(8);
    expect(stored?.weightUsed).toBe(135);
    expect(stored?.effort).toBe(4);
    expect(stored?.notes).toBe('felt good');
  });

  it('round-trips a result with an approximate time value', async () => {
    await saveCalibration(approximate);

    const stored = await getCalibration(approximate.exerciseId);

    expect(stored?.time).toEqual({ kind: 'approximate', bucket: 'moderate' });
    expect(stored?.repsCompleted).toBe(10);
  });

  it('stamps calibratedAt with the current time on save, ignoring any caller-supplied value', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-06-15T12:00:00.000Z'));

    await saveCalibration(precise);
    const stored = await getCalibration(precise.exerciseId);

    expect(stored?.calibratedAt).toBe('2024-06-15T12:00:00.000Z');

    jest.useRealTimers();
  });

  it('returns null for an exercise that has never been calibrated', async () => {
    const stored = await getCalibration('never-calibrated-exercise');

    expect(stored).toBeNull();
  });

  it('overwrites the previous result on a second save (re-calibration)', async () => {
    await saveCalibration(precise);
    await saveCalibration({
      ...precise,
      repsCompleted: 12,
      time: { kind: 'approximate', bucket: 'long' },
    });

    const stored = await getCalibration(precise.exerciseId);

    expect(stored?.repsCompleted).toBe(12);
    expect(stored?.time).toEqual({ kind: 'approximate', bucket: 'long' });
  });
});

describe('isCalibrated', () => {
  it('returns false for an exercise with no stored result', async () => {
    expect(await isCalibrated('never-calibrated-exercise')).toBe(false);
  });

  it('returns true after a calibration result has been saved', async () => {
    await saveCalibration(precise);

    expect(await isCalibrated(precise.exerciseId)).toBe(true);
  });
});
