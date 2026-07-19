import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import { ExerciseList } from './ExerciseList';
import type { Exercise } from '@/data/exercises';

const exercises: Exercise[] = [
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
];

describe('ExerciseList', () => {
  it('renders a card for every exercise passed in, showing its equipment', () => {
    render(<ExerciseList exercises={exercises} calibratedIds={new Set()} onExercisePress={() => {}} />);

    expect(screen.getByText('Low Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('High Count Exercise')).toBeOnTheScreen();
    expect(screen.getByText('bodyweight')).toBeOnTheScreen();
    expect(screen.getByText('barbell')).toBeOnTheScreen();
  });

  it('renders full primary and secondary muscle lists for a card', () => {
    render(<ExerciseList exercises={exercises} calibratedIds={new Set()} onExercisePress={() => {}} />);

    const card = screen.getByTestId('exercise-card-high-count');

    expect(within(card).getByText('chest, triceps')).toBeOnTheScreen();
    expect(within(card).getByText('shoulders, biceps')).toBeOnTheScreen();
  });

  it('shows a calibrated indicator only for exercise ids present in calibratedIds', () => {
    render(
      <ExerciseList
        exercises={exercises}
        calibratedIds={new Set(['high-count'])}
        onExercisePress={() => {}}
      />
    );

    expect(
      within(screen.getByTestId('exercise-card-high-count')).getByText('Calibrated')
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('exercise-card-low-count')).queryByText('Calibrated')
    ).not.toBeOnTheScreen();
  });

  it('calls onExercisePress with the tapped exercise when its card is pressed', () => {
    const onExercisePress = jest.fn();
    render(
      <ExerciseList exercises={exercises} calibratedIds={new Set()} onExercisePress={onExercisePress} />
    );

    fireEvent.press(screen.getByTestId('exercise-card-high-count'));

    expect(onExercisePress).toHaveBeenCalledWith(exercises[1]);
    expect(onExercisePress).toHaveBeenCalledTimes(1);
  });

  it('renders via FlatList, keyed by exercise id, with data in the order passed in', () => {
    render(<ExerciseList exercises={exercises} calibratedIds={new Set()} onExercisePress={() => {}} />);

    const list = screen.UNSAFE_getByType(FlatList);

    expect(list.props.data).toEqual(exercises);
    expect(list.props.keyExtractor(exercises[1], 1)).toBe('high-count');
  });

  it('renders every exercise beyond the default virtualization window when forced to a full initial render', () => {
    const manyExercises: Exercise[] = Array.from({ length: 15 }, (_, index) => ({
      id: `exercise-${index}`,
      name: `Exercise ${index}`,
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['bodyweight'],
    }));

    render(
      <ExerciseList
        exercises={manyExercises}
        calibratedIds={new Set()}
        onExercisePress={() => {}}
        initialNumToRender={manyExercises.length}
      />
    );

    // FlatList's default initialNumToRender is 10 — this list is 15
    // deep specifically so a naive/default virtualized render would
    // clip the tail. Asserting on the last item is what actually
    // exercises the "forced full render" setup below; asserting only
    // on early items would pass even without it.
    expect(screen.getByText('Exercise 14')).toBeOnTheScreen();
  });

  it('does not force every item to render up front without an explicit initialNumToRender override', () => {
    const manyExercises: Exercise[] = Array.from({ length: 15 }, (_, index) => ({
      id: `exercise-${index}`,
      name: `Exercise ${index}`,
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: ['bodyweight'],
    }));

    render(<ExerciseList exercises={manyExercises} calibratedIds={new Set()} onExercisePress={() => {}} />);

    // Confirms the previous test's full render is actually forced by
    // the override, not incidental — without it, FlatList's own
    // default window leaves the tail of a 15-item list unrendered.
    expect(screen.queryByText('Exercise 14')).not.toBeOnTheScreen();
  });
});
