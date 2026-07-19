import { FlatList, StyleSheet } from 'react-native';

import { ExerciseCard } from '@/components/ExerciseCard';
import { colors } from '@/constants/theme';
import type { Exercise } from '@/data/exercises';

type Props = {
  exercises: Exercise[];
  calibratedIds: ReadonlySet<string>;
  onExercisePress: (exercise: Exercise) => void;
  /**
   * FlatList virtualization override, left unset in production so
   * FlatList's own tuning applies against the real ~856-entry
   * database. Exists as a seam for tests: RNTL's test renderer
   * doesn't simulate real scrolling/layout measurement, so a test
   * covering "every exercise reachable by scroll" against a list
   * longer than the default `initialNumToRender` (10) needs to force
   * a full initial render by passing a sized value here rather than
   * asserting only on whatever renders by default under
   * virtualization.
   */
  initialNumToRender?: number;
};

/**
 * Renders the `/calibrate` screen's exercise cards — the "how to
 * render it" half of the split. The screen
 * (`src/app/calibrate/index.tsx`) owns "what to render": loading the
 * exercise data, sorting it, and resolving calibration status. This
 * component just takes the already-sorted list, the resulting
 * calibrated-id set, and a press handler, and renders a card per
 * exercise. Virtualized via `FlatList` — at the real ~856-entry
 * exercise database, an unvirtualized render is a genuine on-device
 * performance/memory concern.
 */
export function ExerciseList({ exercises, calibratedIds, onExercisePress, initialNumToRender }: Props) {
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={exercises}
      keyExtractor={(exercise) => exercise.id}
      renderItem={({ item }) => (
        <ExerciseCard
          exercise={item}
          calibrated={calibratedIds.has(item.id)}
          onPress={() => onExercisePress(item)}
        />
      )}
      initialNumToRender={initialNumToRender}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
});
