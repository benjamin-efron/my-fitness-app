import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ExerciseList } from '@/components/ExerciseList';
import { colors, typography } from '@/constants/theme';
import { isCalibrated } from '@/data/calibrationStorage';
import { loadExercises } from '@/data/exercises';
import type { Exercise } from '@/data/exercises';
import { getEquipmentOptions, getMuscleGroupOptions } from '@/data/exerciseOptions';

function totalMuscleCount(exercise: Exercise): number {
  return exercise.primaryMuscles.length + exercise.secondaryMuscles.length;
}

/**
 * Default sort: total muscle groups worked (primary + secondary),
 * most first — the "highest-value exercise" signal from spec.md's
 * Summary. Also the fallback used within each tier of the target
 * muscle sort below, and whenever the muscle-group filter isn't
 * narrowed to exactly one target.
 */
function sortByMuscleCountDesc(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => totalMuscleCount(b) - totalMuscleCount(a));
}

/**
 * An exercise matches the muscle-group filter if *any* selected group
 * appears in either its primary or secondary muscles — per spec.md,
 * there's no "match all selected groups" mode, and no distinction
 * between matching as primary vs. secondary for filtering purposes
 * (that distinction only affects sort, see `sortByTargetMuscle`).
 */
function matchesSelectedMuscleGroups(exercise: Exercise, selectedGroups: ReadonlySet<string>): boolean {
  if (selectedGroups.size === 0) {
    return true;
  }
  return (
    exercise.primaryMuscles.some((muscle) => selectedGroups.has(muscle)) ||
    exercise.secondaryMuscles.some((muscle) => selectedGroups.has(muscle))
  );
}

/**
 * An exercise matches the equipment filter if its `equipment` list
 * includes *any* selected type — same "match any, not all" semantics
 * as `matchesSelectedMuscleGroups`, and combined with every other
 * active filter rather than being mutually exclusive with them (see
 * spec.md's equipment filter and task 9's muscle-group filter).
 */
function matchesSelectedEquipment(exercise: Exercise, selectedEquipment: ReadonlySet<string>): boolean {
  if (selectedEquipment.size === 0) {
    return true;
  }
  return exercise.equipment.some((type) => selectedEquipment.has(type));
}

/**
 * Target muscle group sort (spec.md's "Target muscle group sort"):
 * with exactly one muscle group selected, exercises where it's a
 * *primary* muscle come before exercises where it's only *secondary*
 * (or the reverse, via `primaryTierFirst`), each tier internally
 * falling back to the default count-desc sort. Callers are expected
 * to have already filtered `exercises` down to matches for `target`
 * via `matchesSelectedMuscleGroups`, so every entry here is in
 * exactly one of the two tiers.
 */
function sortByTargetMuscle(exercises: Exercise[], target: string, primaryTierFirst: boolean): Exercise[] {
  const primaryTier = sortByMuscleCountDesc(
    exercises.filter((exercise) => exercise.primaryMuscles.includes(target))
  );
  const secondaryTier = sortByMuscleCountDesc(
    exercises.filter((exercise) => !exercise.primaryMuscles.includes(target))
  );

  return primaryTierFirst ? [...primaryTier, ...secondaryTier] : [...secondaryTier, ...primaryTier];
}

/**
 * `/calibrate` — the exercise list from spec.md's "1. Exercise list".
 * Owns "what to render": loading the exercise data, the default
 * sort, resolving calibration status, and narrowing/re-sorting the
 * list via search text, the hide-calibrated toggle, and the
 * muscle-group filter (including its single-target two-tier sort).
 * Rendering itself ("how to render it") is `ExerciseList`, which only
 * ever sees the already-filtered/sorted list — it stays unaware that
 * filtering exists. The equipment filter is transient/derived only —
 * per spec.md's non-goals, there's no persisted record of what
 * equipment the user actually owns.
 */
export default function CalibrateList() {
  const [exercises] = useState<Exercise[]>(() => sortByMuscleCountDesc(loadExercises()));
  const [calibratedIds, setCalibratedIds] = useState<ReadonlySet<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCalibrated, setHideCalibrated] = useState(false);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<ReadonlySet<string>>(new Set());
  const [primaryTierFirst, setPrimaryTierFirst] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<ReadonlySet<string>>(new Set());

  const muscleGroupOptions = useMemo(() => getMuscleGroupOptions(exercises), [exercises]);
  const equipmentOptions = useMemo(() => getEquipmentOptions(exercises), [exercises]);

  function toggleMuscleGroup(group: string) {
    setSelectedMuscleGroups((previous) => {
      const next = new Set(previous);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function toggleEquipment(type: string) {
    setSelectedEquipment((previous) => {
      const next = new Set(previous);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // `useFocusEffect` (not a plain `useEffect`) is required here: the
  // root layout's Stack keeps this screen mounted (not unmounted)
  // while `/calibrate/[id]` is pushed on top of it, so a plain
  // mount-only effect would never re-run after `router.back()`
  // returns here, leaving `calibratedIds` stuck showing whatever was
  // calibrated *before* the user entered the calibration flow. Focus
  // fires on every return to this screen regardless of `exercises`'s
  // (stable) identity, so this re-queries AsyncStorage each time the
  // list becomes visible again — including right after a save.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadCalibrationStatus() {
        const entries = await Promise.all(
          exercises.map(async (exercise) => [exercise.id, await isCalibrated(exercise.id)] as const)
        );

        if (!cancelled) {
          setCalibratedIds(new Set(entries.filter(([, calibrated]) => calibrated).map(([id]) => id)));
        }
      }

      loadCalibrationStatus();

      return () => {
        cancelled = true;
      };
    }, [exercises])
  );

  const visibleExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // `exercises` is already sorted by the task 4 default (count-desc)
    // at load time, and .filter() preserves relative order — so when
    // the target sort below doesn't apply, this filtered result is
    // already in default sort order without re-sorting it here.
    const filtered = exercises.filter((exercise) => {
      if (query && !exercise.name.toLowerCase().includes(query)) {
        return false;
      }
      if (hideCalibrated && calibratedIds.has(exercise.id)) {
        return false;
      }
      if (!matchesSelectedMuscleGroups(exercise, selectedMuscleGroups)) {
        return false;
      }
      if (!matchesSelectedEquipment(exercise, selectedEquipment)) {
        return false;
      }
      return true;
    });

    // Target muscle group sort only applies with exactly one group
    // selected (spec.md's "Target muscle group sort") — two or more
    // selected groups, or none, uses the default sort above as-is.
    // The equipment filter never changes sort order, only membership.
    if (selectedMuscleGroups.size === 1) {
      const [target] = selectedMuscleGroups;
      return sortByTargetMuscle(filtered, target, primaryTierFirst);
    }

    return filtered;
  }, [
    exercises,
    searchQuery,
    hideCalibrated,
    calibratedIds,
    selectedMuscleGroups,
    primaryTierFirst,
    selectedEquipment,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hide calibrated</Text>
          <Switch accessibilityLabel="Hide calibrated" value={hideCalibrated} onValueChange={setHideCalibrated} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {muscleGroupOptions.map((group) => {
            const selected = selectedMuscleGroups.has(group);
            return (
              <Pressable
                key={group}
                onPress={() => toggleMuscleGroup(group)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${group}`}
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {selectedMuscleGroups.size === 1 && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Secondary matches first</Text>
            <Switch
              accessibilityLabel="Secondary matches first"
              value={!primaryTierFirst}
              onValueChange={(secondaryFirst) => setPrimaryTierFirst(!secondaryFirst)}
            />
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {equipmentOptions.map((type) => {
            const selected = selectedEquipment.has(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleEquipment(type)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by equipment: ${type}`}
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{type}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ExerciseList
        exercises={visibleExercises}
        calibratedIds={calibratedIds}
        onExercisePress={(exercise) => router.push(`/calibrate/${exercise.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    ...typography.label,
    color: colors.text,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    backgroundColor: colors.filterChip.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: colors.filterChip.backgroundSelected,
  },
  chipText: {
    ...typography.label,
    color: colors.filterChip.text,
  },
  chipTextSelected: {
    color: colors.filterChip.textSelected,
  },
});
