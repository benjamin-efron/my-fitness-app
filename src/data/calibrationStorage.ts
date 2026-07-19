import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * How long a calibration's failure set took. A discriminated union
 * (rather than two nullable fields) so a stored result can't end up
 * with both a precise time and a bucket, or neither — see
 * specs/20260705-exercise-calibration/spec.md.
 */
export type TimeTaken =
  | { kind: 'precise'; seconds: number } // stopwatch or typed directly
  | { kind: 'approximate'; bucket: 'short' | 'moderate' | 'long' };

export type CalibrationResult = {
  exerciseId: string;
  repsCompleted: number; // reps to failure at weightUsed
  weightUsed: number; // lbs
  time: TimeTaken;
  effort: number; // 1-5, thumbs scale
  notes: string; // "" if not provided
  calibratedAt: string; // ISO 8601 timestamp, set on every save
};

function calibrationKey(exerciseId: string): string {
  return `calibration:${exerciseId}`;
}

/**
 * Persists a calibration result under `calibration:<exerciseId>`,
 * stamping `calibratedAt` with the current time (any value on the
 * passed-in `result` is ignored). A second save for the same
 * exercise overwrites the first outright — re-calibration has no
 * history, per specs/20260705-exercise-calibration/spec.md.
 */
export async function saveCalibration(result: CalibrationResult): Promise<void> {
  const toStore: CalibrationResult = {
    ...result,
    calibratedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(calibrationKey(result.exerciseId), JSON.stringify(toStore));
}

/**
 * Returns the stored calibration result for an exercise, or `null` if
 * it hasn't been calibrated yet.
 */
export async function getCalibration(exerciseId: string): Promise<CalibrationResult | null> {
  const raw = await AsyncStorage.getItem(calibrationKey(exerciseId));

  if (raw === null) {
    return null;
  }

  return JSON.parse(raw) as CalibrationResult;
}

/**
 * Convenience wrapper for the list screen's calibrated badge — avoids
 * every caller re-deriving "exists" from `getCalibration`.
 */
export async function isCalibrated(exerciseId: string): Promise<boolean> {
  return (await getCalibration(exerciseId)) !== null;
}
