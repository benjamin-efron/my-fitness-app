import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import CalibrateList from './index';

const mockPush = jest.fn();

// Captures the latest callback CalibrateList registers via
// `useFocusEffect`, so tests can simulate the screen regaining focus
// (e.g. `router.back()` from the calibration flow returning to an
// already-mounted list) without unmounting/remounting the component —
// jsdom has no real navigation focus/blur events to dispatch, so this
// mock reproduces the one piece of expo-router's real behavior this
// screen depends on: running the effect again on every focus, not
// just on mount.
let mockRunFocusEffect: () => void = () => {};

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline require keeps this factory self-contained per Jest's module-mocking convention
  const ReactActual = require('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockRunFocusEffect = () => {
        effect();
      };
      // Mirrors expo-router's real useFocusEffect: fires once for the
      // initial focus on mount. Deliberately ignores `effect`'s own
      // identity so it behaves like a real focus listener rather than
      // a plain useEffect keyed on deps — subsequent focus events
      // (asserted via `mockRunFocusEffect` above) don't depend on the
      // callback identity changing, since focus events aren't a
      // dependency-array concept in real navigation.
      ReactActual.useEffect(() => {
        effect();
      }, []);
    },
  };
});

jest.mock('@/data/exercises', () => ({
  loadExercises: () => [
    {
      id: 'low-count',
      name: 'Low Count Exercise',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['bodyweight'],
    },
    {
      id: 'high-count',
      name: 'High Count Exercise',
      primaryMuscles: ['chest', 'triceps'],
      secondaryMuscles: ['shoulders', 'biceps'],
      equipment: ['barbell'],
    },
    {
      id: 'calibrated-exercise',
      name: 'Calibrated Count Exercise',
      primaryMuscles: ['back'],
      secondaryMuscles: ['biceps'],
      equipment: ['dumbbell'],
    },
    // Fixtures for the muscle-group filter/target-sort tests below.
    // 'glutes' appears as a primary muscle on one and a secondary
    // muscle on the other, giving each filter tier exactly one match;
    // 'non-target' has neither, to prove the filter excludes it.
    {
      id: 'target-primary',
      name: 'Target Primary Exercise',
      primaryMuscles: ['glutes'],
      secondaryMuscles: [],
      equipment: ['kettlebell'],
    },
    {
      id: 'target-secondary',
      name: 'Target Secondary Exercise',
      primaryMuscles: ['hamstrings'],
      secondaryMuscles: ['glutes'],
      equipment: ['cable'],
    },
    {
      id: 'non-target',
      name: 'Non Target Exercise',
      primaryMuscles: ['forearms'],
      secondaryMuscles: [],
      equipment: ['machine'],
    },
  ],
}));

const mockIsCalibrated = jest.fn((id: string) => Promise.resolve(id === 'calibrated-exercise'));

jest.mock('@/data/calibrationStorage', () => ({
  isCalibrated: (id: string) => mockIsCalibrated(id),
}));

/**
 * Renders the list and waits for the async calibration-status effect
 * to settle (it always resolves the seeded 'calibrated-exercise' to
 * calibrated) before returning, so every test observes the same
 * settled state instead of racing it — and so React state updates
 * from that effect never land outside of `act` after a test ends.
 */
async function renderSettledList() {
  render(<CalibrateList />);

  await waitFor(() => {
    expect(
      within(screen.getByTestId('exercise-card-calibrated-exercise')).getByText('Calibrated')
    ).toBeOnTheScreen();
  });
}

describe('CalibrateList', () => {
  afterEach(() => {
    mockPush.mockClear();
    mockIsCalibrated.mockImplementation((id: string) => Promise.resolve(id === 'calibrated-exercise'));
  });

  it('renders a card for every exercise, showing its equipment', async () => {
    await renderSettledList();

    expect(screen.getByText('Low Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('High Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('Calibrated Count Exercise')).toBeOnTheScreen();
    // Scoped to each card, rather than a bare screen-wide getByText, because
    // the equipment filter chips added in task 10 render the same equipment
    // strings as standalone text elsewhere on screen.
    expect(within(screen.getByTestId('exercise-card-low-count')).getByText('bodyweight')).toBeOnTheScreen();
    expect(within(screen.getByTestId('exercise-card-high-count')).getByText('barbell')).toBeOnTheScreen();
    expect(within(screen.getByTestId('exercise-card-calibrated-exercise')).getByText('dumbbell')).toBeOnTheScreen();
  });

  it('sorts exercises by total muscle count (primary + secondary), most first', async () => {
    await renderSettledList();

    const names = screen.getAllByText(/Count Exercise$/).map((node) => node.props.children);

    // high-count: 4 muscles, calibrated-exercise: 2, low-count: 1
    expect(names).toEqual(['High Count Exercise', 'Calibrated Count Exercise', 'Low Count Exercise']);
  });

  it('shows a calibrated indicator only for a pre-seeded calibrated exercise', async () => {
    await renderSettledList();

    expect(within(screen.getByTestId('exercise-card-low-count')).queryByText('Calibrated')).not.toBeOnTheScreen();
    expect(within(screen.getByTestId('exercise-card-high-count')).queryByText('Calibrated')).not.toBeOnTheScreen();
  });

  it('navigates to the calibration route for the tapped exercise id', async () => {
    await renderSettledList();

    fireEvent.press(screen.getByTestId('exercise-card-high-count'));

    expect(mockPush).toHaveBeenCalledWith('/calibrate/high-count');
  });

  it('narrows the list to exercises whose name case-insensitively matches the typed search text', async () => {
    await renderSettledList();

    fireEvent.changeText(screen.getByPlaceholderText('Search exercises'), 'HIGH');

    expect(screen.getByText('High Count Exercise')).toBeOnTheScreen();
    expect(screen.queryByText('Low Count Exercise')).not.toBeOnTheScreen();
    expect(screen.queryByText('Calibrated Count Exercise')).not.toBeOnTheScreen();
  });

  it('restores the full list when the search input is cleared', async () => {
    await renderSettledList();

    const searchInput = screen.getByPlaceholderText('Search exercises');
    fireEvent.changeText(searchInput, 'high');
    fireEvent.changeText(searchInput, '');

    expect(screen.getByText('Low Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('High Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('Calibrated Count Exercise')).toBeOnTheScreen();
  });

  it('hides calibrated exercises when the hide-calibrated toggle is enabled', async () => {
    await renderSettledList();

    fireEvent(screen.getByLabelText('Hide calibrated'), 'valueChange', true);

    expect(screen.queryByText('Calibrated Count Exercise')).not.toBeOnTheScreen();
    expect(screen.getByText('Low Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('High Count Exercise')).toBeOnTheScreen();
  });

  it('restores calibrated exercises when the hide-calibrated toggle is disabled again', async () => {
    await renderSettledList();

    const toggle = screen.getByLabelText('Hide calibrated');
    fireEvent(toggle, 'valueChange', true);
    fireEvent(toggle, 'valueChange', false);

    expect(screen.getByText('Calibrated Count Exercise')).toBeOnTheScreen();
  });

  it('reflects a newly-completed calibration on the already-mounted list without remounting', async () => {
    await renderSettledList();

    // Not calibrated at initial mount — matches the seeded mock.
    expect(within(screen.getByTestId('exercise-card-low-count')).queryByText('Calibrated')).not.toBeOnTheScreen();

    // Simulate the calibration flow (a separate pushed screen) saving
    // a result for 'low-count' while this list stays mounted
    // underneath it, then simulate `router.back()` returning focus to
    // this same instance — the exact scenario from the bug report.
    mockIsCalibrated.mockImplementation(
      (id: string) => Promise.resolve(id === 'calibrated-exercise' || id === 'low-count')
    );
    await act(async () => {
      mockRunFocusEffect();
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('exercise-card-low-count')).getByText('Calibrated')).toBeOnTheScreen();
    });

    fireEvent(screen.getByLabelText('Hide calibrated'), 'valueChange', true);

    expect(screen.queryByText('Low Count Exercise')).not.toBeOnTheScreen();
  });

  describe('muscle group filter', () => {
    it('narrows the list to exercises where the selected group appears in either muscle list', async () => {
      await renderSettledList();

      fireEvent.press(screen.getByLabelText('Filter by glutes'));

      expect(screen.getByText('Target Primary Exercise')).toBeOnTheScreen();
      expect(screen.getByText('Target Secondary Exercise')).toBeOnTheScreen();
      expect(screen.queryByText('Non Target Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('Low Count Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('High Count Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('Calibrated Count Exercise')).not.toBeOnTheScreen();
    });

    it('with a single group selected, renders a primary-match exercise above a secondary-match one', async () => {
      await renderSettledList();

      fireEvent.press(screen.getByLabelText('Filter by glutes'));

      const names = screen
        .getAllByText(/^Target (Primary|Secondary) Exercise$/)
        .map((node) => node.props.children);

      expect(names).toEqual(['Target Primary Exercise', 'Target Secondary Exercise']);
    });

    it('flipping the tier-order toggle reverses primary/secondary-match order', async () => {
      await renderSettledList();

      fireEvent.press(screen.getByLabelText('Filter by glutes'));
      fireEvent(screen.getByLabelText('Secondary matches first'), 'valueChange', true);

      const names = screen
        .getAllByText(/^Target (Primary|Secondary) Exercise$/)
        .map((node) => node.props.children);

      expect(names).toEqual(['Target Secondary Exercise', 'Target Primary Exercise']);
    });

    it('selecting a second group reverts to the default count-based sort', async () => {
      await renderSettledList();

      fireEvent.press(screen.getByLabelText('Filter by glutes'));
      fireEvent.press(screen.getByLabelText('Filter by hamstrings'));

      // target-secondary has 2 muscles total (hamstrings + glutes),
      // target-primary has 1 (glutes only) — count-desc order puts
      // target-secondary first, the opposite of the single-target
      // tier order asserted above (primary-match tier first).
      const names = screen
        .getAllByText(/^Target (Primary|Secondary) Exercise$/)
        .map((node) => node.props.children);

      expect(names).toEqual(['Target Secondary Exercise', 'Target Primary Exercise']);
    });
  });

  describe('equipment filter', () => {
    it('narrows the list to exercises whose equipment includes the selected type', async () => {
      await renderSettledList();

      fireEvent.press(screen.getByLabelText('Filter by equipment: kettlebell'));

      expect(screen.getByText('Target Primary Exercise')).toBeOnTheScreen();
      expect(screen.queryByText('Target Secondary Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('Non Target Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('Low Count Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('High Count Exercise')).not.toBeOnTheScreen();
      expect(screen.queryByText('Calibrated Count Exercise')).not.toBeOnTheScreen();
    });

    it('combines with the muscle-group filter to narrow to the intersection', async () => {
      await renderSettledList();

      // Both 'target-primary' (kettlebell) and 'target-secondary'
      // (cable) match the 'glutes' muscle group filter alone; adding
      // the 'kettlebell' equipment filter should narrow that down to
      // their intersection — target-primary only.
      fireEvent.press(screen.getByLabelText('Filter by glutes'));
      fireEvent.press(screen.getByLabelText('Filter by equipment: kettlebell'));

      expect(screen.getByText('Target Primary Exercise')).toBeOnTheScreen();
      expect(screen.queryByText('Target Secondary Exercise')).not.toBeOnTheScreen();
    });
  });
});
