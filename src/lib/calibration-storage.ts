import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CalibrationResult } from '@/types/calibration';

const STORAGE_KEY = 'calibrations';

type CalibrationMap = Record<string, CalibrationResult>;

async function readAll(): Promise<CalibrationMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getAllCalibrations(): Promise<CalibrationMap> {
  return readAll();
}

export async function getCalibration(exerciseId: string): Promise<CalibrationResult | null> {
  const all = await readAll();
  return all[exerciseId] ?? null;
}

export async function saveCalibration(result: CalibrationResult): Promise<void> {
  const all = await readAll();
  all[result.exerciseId] = result;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function deleteCalibration(exerciseId: string): Promise<void> {
  const all = await readAll();
  delete all[exerciseId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
