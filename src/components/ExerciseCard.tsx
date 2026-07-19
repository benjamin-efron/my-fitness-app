import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import type { Exercise } from '@/data/exercises';

type Props = {
  exercise: Exercise;
  calibrated: boolean;
  onPress: () => void;
};

/**
 * A single exercise row for the `/calibrate` list (spec.md, "1.
 * Exercise list"). Muscle lists follow the shared "Muscle group
 * display" convention: primary muscles get the more vibrant
 * treatment, secondary muscles the muted one.
 *
 * INVARIANT — this same convention also applies to the calibration
 * flow's header (spec.md, "2. Calibration flow"). Nothing shares the
 * styling between the two, so keep any color changes here in sync
 * with that screen by hand.
 */
export function ExerciseCard({ exercise, calibrated, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      testID={`exercise-card-${exercise.id}`}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        {calibrated && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Calibrated</Text>
          </View>
        )}
      </View>

      {exercise.primaryMuscles.length > 0 && (
        <Text style={styles.primaryMuscles}>{exercise.primaryMuscles.join(', ')}</Text>
      )}
      {exercise.secondaryMuscles.length > 0 && (
        <Text style={styles.secondaryMuscles}>{exercise.secondaryMuscles.join(', ')}</Text>
      )}

      <Text style={styles.equipment}>{exercise.equipment.join(', ')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    ...typography.cardTitle,
    color: colors.text,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.calibratedBadge.background,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.badge,
    color: colors.calibratedBadge.text,
  },
  primaryMuscles: {
    ...typography.label,
    color: colors.primaryMuscle.text,
    fontWeight: '600',
  },
  secondaryMuscles: {
    ...typography.label,
    color: colors.secondaryMuscle.text,
  },
  equipment: {
    ...typography.label,
    color: colors.equipment,
    marginTop: 4,
  },
});
