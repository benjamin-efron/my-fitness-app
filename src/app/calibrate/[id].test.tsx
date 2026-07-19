import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CalibrationForm from './[id]';
import { getCalibration, saveCalibration } from '@/data/calibrationStorage';

// jest.mock calls are hoisted above imports by the babel-jest transform,
// so this runs before `@/data/calibrationStorage` (and its AsyncStorage
// import) is evaluated despite the source-order position here — same
// reasoning as `src/data/calibrationStorage.test.ts`.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args) },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@/data/exercises', () => ({
  loadExercises: () => [
    {
      id: 'barbell-bench-press',
      name: 'Barbell Bench Press',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps', 'shoulders'],
      equipment: ['barbell', 'bench'],
    },
  ],
}));

function fillValidForm() {
  fireEvent.changeText(screen.getByLabelText('Reps completed'), '8');
  fireEvent.changeText(screen.getByLabelText('Weight used (lbs)'), '135');
  fireEvent.press(screen.getByLabelText('Effort 4'));
  fireEvent.changeText(screen.getByLabelText('Time taken (seconds)'), '42');
}

describe('CalibrationForm', () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'barbell-bench-press' });
  });

  afterEach(async () => {
    mockBack.mockClear();
    await AsyncStorage.clear();
  });

  it('shows the exercise name, its named primary/secondary muscles, and equipment in the header', () => {
    render(<CalibrationForm />);

    expect(screen.getByText('Barbell Bench Press')).toBeOnTheScreen();
    expect(screen.getByText('chest')).toBeOnTheScreen();
    expect(screen.getByText('triceps, shoulders')).toBeOnTheScreen();
    expect(screen.getByText('barbell, bench')).toBeOnTheScreen();
  });

  it('disables Save when the form is empty', () => {
    render(<CalibrationForm />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables Save once reps, weight, effort, and time all have values', () => {
    render(<CalibrationForm />);

    fillValidForm();

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('keeps Save disabled if effort is left untapped, even with every other field filled in', () => {
    render(<CalibrationForm />);

    fireEvent.changeText(screen.getByLabelText('Reps completed'), '8');
    fireEvent.changeText(screen.getByLabelText('Weight used (lbs)'), '135');
    fireEvent.changeText(screen.getByLabelText('Time taken (seconds)'), '42');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('persists a precise-time CalibrationResult on Save and navigates back to the list', async () => {
    render(<CalibrationForm />);

    fillValidForm();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const stored = await getCalibration('barbell-bench-press');
    expect(stored).toMatchObject({
      exerciseId: 'barbell-bench-press',
      repsCompleted: 8,
      weightUsed: 135,
      time: { kind: 'precise', seconds: 42 },
      effort: 4,
      notes: '',
    });
  });

  describe('stopwatch', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stopping the stopwatch after a simulated interval populates the time field with the elapsed whole seconds', () => {
      render(<CalibrationForm />);

      fireEvent.press(screen.getByLabelText('Start stopwatch'));
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      fireEvent.press(screen.getByLabelText('Stop stopwatch'));

      expect(screen.getByLabelText('Time taken (seconds)').props.value).toBe('5');
    });

    it('editing the time field after stopping the stopwatch overrides the stopwatch value', () => {
      render(<CalibrationForm />);

      fireEvent.press(screen.getByLabelText('Start stopwatch'));
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      fireEvent.press(screen.getByLabelText('Stop stopwatch'));

      fireEvent.changeText(screen.getByLabelText('Time taken (seconds)'), '99');

      expect(screen.getByLabelText('Time taken (seconds)').props.value).toBe('99');
    });
  });

  describe('approximate time', () => {
    function fillNonTimeFields() {
      fireEvent.changeText(screen.getByLabelText('Reps completed'), '8');
      fireEvent.changeText(screen.getByLabelText('Weight used (lbs)'), '135');
      fireEvent.press(screen.getByLabelText('Effort 4'));
    }

    it('keeps Save disabled after switching to approximate mode until a bucket is picked', () => {
      render(<CalibrationForm />);

      fillNonTimeFields();
      fireEvent.press(screen.getByLabelText('Time mode: Approximate'));

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('switching to approximate mode and picking a bucket enables Save without a numeric time entered', () => {
      render(<CalibrationForm />);

      fillNonTimeFields();
      fireEvent.press(screen.getByLabelText('Time mode: Approximate'));
      fireEvent.press(screen.getByLabelText('Time bucket: moderate'));

      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('persists an approximate-time CalibrationResult with the selected bucket on Save', async () => {
      render(<CalibrationForm />);

      fillNonTimeFields();
      fireEvent.press(screen.getByLabelText('Time mode: Approximate'));
      fireEvent.press(screen.getByLabelText('Time bucket: long'));
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

      const stored = await getCalibration('barbell-bench-press');
      expect(stored).toMatchObject({
        exerciseId: 'barbell-bench-press',
        repsCompleted: 8,
        weightUsed: 135,
        time: { kind: 'approximate', bucket: 'long' },
        effort: 4,
        notes: '',
      });
    });
  });

  describe('re-calibration pre-fill', () => {
    it('pre-fills reps, weight, effort, notes, and a precise time from an existing CalibrationResult', async () => {
      await saveCalibration({
        exerciseId: 'barbell-bench-press',
        repsCompleted: 10,
        weightUsed: 185,
        time: { kind: 'precise', seconds: 37 },
        effort: 5,
        notes: 'felt strong today',
        calibratedAt: '',
      });

      render(<CalibrationForm />);

      await waitFor(() =>
        expect(screen.getByLabelText('Reps completed').props.value).toBe('10')
      );
      expect(screen.getByLabelText('Weight used (lbs)').props.value).toBe('185');
      expect(screen.getByLabelText('Notes (optional)').props.value).toBe('felt strong today');
      expect(screen.getByLabelText('Effort 5')).toBeSelected();

      // Precise mode is the stored kind, so the numeric seconds field
      // (not the approximate bucket picker) should hold the value.
      expect(screen.getByLabelText('Time mode: Precise')).toBeSelected();
      expect(screen.getByLabelText('Time taken (seconds)').props.value).toBe('37');
    });

    it('pre-fills approximate time by switching to approximate mode and selecting the stored bucket', async () => {
      await saveCalibration({
        exerciseId: 'barbell-bench-press',
        repsCompleted: 6,
        weightUsed: 225,
        time: { kind: 'approximate', bucket: 'short' },
        effort: 2,
        notes: '',
        calibratedAt: '',
      });

      render(<CalibrationForm />);

      await waitFor(() =>
        expect(screen.getByLabelText('Reps completed').props.value).toBe('6')
      );
      expect(screen.getByLabelText('Weight used (lbs)').props.value).toBe('225');
      expect(screen.getByLabelText('Effort 2')).toBeSelected();
      expect(screen.getByLabelText('Time mode: Approximate')).toBeSelected();
      expect(screen.getByLabelText('Time bucket: short')).toBeSelected();
    });

    it('overwrites the existing stored result on Save instead of creating a second entry', async () => {
      await saveCalibration({
        exerciseId: 'barbell-bench-press',
        repsCompleted: 10,
        weightUsed: 185,
        time: { kind: 'precise', seconds: 37 },
        effort: 5,
        notes: 'felt strong today',
        calibratedAt: '',
      });

      render(<CalibrationForm />);

      await waitFor(() =>
        expect(screen.getByLabelText('Reps completed').props.value).toBe('10')
      );

      fireEvent.changeText(screen.getByLabelText('Reps completed'), '12');
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

      const keys = await AsyncStorage.getAllKeys();
      expect(keys.filter((key) => key.startsWith('calibration:'))).toHaveLength(1);

      const stored = await getCalibration('barbell-bench-press');
      expect(stored?.repsCompleted).toBe(12);
    });
  });
});
