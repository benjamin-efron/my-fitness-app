import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { getCalibration, saveCalibration, type TimeTaken } from '@/data/calibrationStorage';
import { loadExercises } from '@/data/exercises';

/**
 * Coarse duration buckets for the "approximate" time mode (spec.md,
 * "2. Calibration flow"). Order here also drives the on-screen order
 * of the bucket buttons.
 */
const TIME_BUCKETS = ['short', 'moderate', 'long'] as const;

type TimeBucket = Extract<TimeTaken, { kind: 'approximate' }>['bucket'];

/**
 * 5-point thumbs scale from spec.md's "2. Calibration flow" (mental
 * effort), stored as an integer 1-5. Widget/asset choice is left to
 * the coder per the spec — plain thumb emoji, since the app has no
 * icon set of its own yet.
 */
const EFFORT_LEVELS = [
  { value: 1, label: '👎👎' },
  { value: 2, label: '👎' },
  { value: 3, label: '😐' },
  { value: 4, label: '👍' },
  { value: 5, label: '👍👍' },
] as const;

/**
 * Calibration drill-in form (spec.md, "2. Calibration flow"). Time can
 * be entered by typing a number of seconds directly, by using the
 * in-app stopwatch to fill that same field, or by switching to the
 * approximate short/moderate/long bucket mode instead — a given
 * calibration stores exactly one of the two (see `TimeTaken`).
 * Re-opening this form for an exercise that already has a stored
 * result pre-fills every field, including which time mode was used
 * (spec.md, "3. Re-calibration"); saving from that state overwrites
 * the existing entry rather than creating a new one, since
 * `saveCalibration` always writes to the same per-exercise key.
 */
export default function CalibrationForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useMemo(() => loadExercises().find((candidate) => candidate.id === id), [id]);

  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchStartedAt, setStopwatchStartedAt] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [timeMode, setTimeMode] = useState<'precise' | 'approximate'>('precise');
  const [bucket, setBucket] = useState<TimeBucket | null>(null);

  // Ticks the on-screen elapsed display once a second while the
  // stopwatch is running. The value actually written to the time
  // field on stop is computed fresh from Date.now() at that moment
  // (see handleStopStopwatch), not from this display state — this
  // effect exists purely for the live readout, so a missed/late tick
  // can't skew the recorded time.
  useEffect(() => {
    if (!stopwatchRunning || stopwatchStartedAt === null) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedDisplay(Math.round((Date.now() - stopwatchStartedAt) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [stopwatchRunning, stopwatchStartedAt]);

  // Re-calibration pre-fill (spec.md, "3. Re-calibration"): load any
  // existing result for this exercise and seed the form with it once
  // it comes back from AsyncStorage. `cancelled` guards against
  // setting state after the id changes (or the component unmounts)
  // mid-fetch, which would otherwise clobber a newer render's state
  // with a stale lookup's result.
  useEffect(() => {
    if (!exercise) {
      return;
    }

    let cancelled = false;

    (async () => {
      const stored = await getCalibration(exercise.id);
      if (cancelled || !stored) {
        return;
      }

      setReps(String(stored.repsCompleted));
      setWeight(String(stored.weightUsed));
      setEffort(stored.effort);
      setNotes(stored.notes);

      if (stored.time.kind === 'precise') {
        setTimeMode('precise');
        setSeconds(String(stored.time.seconds));
      } else {
        setTimeMode('approximate');
        setBucket(stored.time.bucket);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exercise]);

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Exercise not found.</Text>
      </View>
    );
  }

  const repsValue = parseInt(reps, 10);
  const weightValue = parseFloat(weight);
  const secondsValue = parseFloat(seconds);

  // A given calibration stores exactly one time representation (see
  // TimeTaken in spec.md), so which half of the form satisfies the
  // save requirement depends on the selected mode — a leftover value
  // in the other mode's field never counts.
  const timeValid =
    timeMode === 'precise'
      ? seconds.trim() !== '' && !Number.isNaN(secondsValue)
      : bucket !== null;

  const canSave =
    reps.trim() !== '' &&
    !Number.isNaN(repsValue) &&
    weight.trim() !== '' &&
    !Number.isNaN(weightValue) &&
    effort !== null &&
    timeValid;

  function handleStartStopwatch() {
    setElapsedDisplay(0);
    setStopwatchStartedAt(Date.now());
    setStopwatchRunning(true);
  }

  function handleStopStopwatch() {
    if (stopwatchStartedAt === null) {
      return;
    }

    // Whole-second rounding is fine per spec.md — no frame-level
    // precision required for a calibration set's duration.
    const elapsedSeconds = Math.round((Date.now() - stopwatchStartedAt) / 1000);
    setSeconds(String(elapsedSeconds));
    setStopwatchRunning(false);
    setStopwatchStartedAt(null);
  }

  async function handleSave() {
    if (!canSave || !exercise || effort === null) {
      return;
    }

    // canSave already guarantees the field for the active mode is
    // filled in (numeric seconds for precise, a picked bucket for
    // approximate), so this narrowing can't throw in practice.
    const time: TimeTaken =
      timeMode === 'precise'
        ? { kind: 'precise', seconds: secondsValue }
        : { kind: 'approximate', bucket: bucket! };

    await saveCalibration({
      exerciseId: exercise.id,
      repsCompleted: repsValue,
      weightUsed: weightValue,
      time,
      effort,
      notes,
      // Overwritten by saveCalibration itself, which always stamps the
      // current time on save — see src/data/calibrationStorage.ts.
      calibratedAt: '',
    });

    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/*
       * INVARIANT — this header follows the same primary/secondary
       * muscle highlighting convention as `ExerciseCard`'s list card
       * (spec.md, "Muscle group display"). Nothing shares styling
       * between the two, so keep any color changes here in sync with
       * `src/components/ExerciseCard.tsx` by hand.
       */}
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        {exercise.primaryMuscles.length > 0 && (
          <Text style={styles.primaryMuscles}>{exercise.primaryMuscles.join(', ')}</Text>
        )}
        {exercise.secondaryMuscles.length > 0 && (
          <Text style={styles.secondaryMuscles}>{exercise.secondaryMuscles.join(', ')}</Text>
        )}
        <Text style={styles.equipment}>{exercise.equipment.join(', ')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Reps completed</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Reps completed"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Weight used (lbs)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Weight used (lbs)"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Mental effort</Text>
        <View style={styles.effortRow}>
          {EFFORT_LEVELS.map((level) => {
            const selected = effort === level.value;
            return (
              <Pressable
                key={level.value}
                onPress={() => setEffort(level.value)}
                accessibilityRole="button"
                accessibilityLabel={`Effort ${level.value}`}
                accessibilityState={{ selected }}
                style={[styles.effortButton, selected && styles.effortButtonSelected]}
              >
                <Text style={styles.effortText}>{level.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Time taken</Text>
        <View style={styles.timeModeRow}>
          {(['precise', 'approximate'] as const).map((mode) => {
            const selected = timeMode === mode;
            const label = mode === 'precise' ? 'Precise' : 'Approximate';
            return (
              <Pressable
                key={mode}
                onPress={() => setTimeMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={`Time mode: ${label}`}
                accessibilityState={{ selected }}
                style={[styles.timeModeButton, selected && styles.timeModeButtonSelected]}
              >
                <Text
                  style={[styles.timeModeText, selected && styles.timeModeTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {timeMode === 'precise' ? (
          <>
            <View style={styles.stopwatchRow}>
              <Pressable
                onPress={stopwatchRunning ? handleStopStopwatch : handleStartStopwatch}
                accessibilityRole="button"
                accessibilityLabel={stopwatchRunning ? 'Stop stopwatch' : 'Start stopwatch'}
                style={styles.stopwatchButton}
              >
                <Text style={styles.stopwatchButtonText}>
                  {stopwatchRunning ? 'Stop' : 'Start'}
                </Text>
              </Pressable>
              {stopwatchRunning && (
                <Text style={styles.stopwatchElapsed}>{elapsedDisplay}s elapsed</Text>
              )}
            </View>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={seconds}
              onChangeText={setSeconds}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Time taken (seconds)"
            />
          </>
        ) : (
          <View style={styles.bucketRow}>
            {TIME_BUCKETS.map((candidate) => {
              const selected = bucket === candidate;
              return (
                <Pressable
                  key={candidate}
                  onPress={() => setBucket(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={`Time bucket: ${candidate}`}
                  accessibilityState={{ selected }}
                  style={[styles.bucketButton, selected && styles.bucketButtonSelected]}
                >
                  <Text style={[styles.bucketText, selected && styles.bucketTextSelected]}>
                    {candidate[0].toUpperCase() + candidate.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Anything else worth remembering"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Notes (optional)"
        />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  notFound: {
    ...typography.cardTitle,
    color: colors.text,
    textAlign: 'center',
    marginTop: 24,
  },
  header: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  name: {
    ...typography.cardTitle,
    color: colors.text,
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
  field: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  effortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  effortButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.filterChip.background,
    borderRadius: 10,
    paddingVertical: 10,
  },
  effortButtonSelected: {
    backgroundColor: colors.filterChip.backgroundSelected,
  },
  effortText: {
    fontSize: 20,
  },
  stopwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopwatchButton: {
    backgroundColor: colors.filterChip.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  stopwatchButtonText: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  stopwatchElapsed: {
    ...typography.label,
    color: colors.textMuted,
  },
  timeModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeModeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.filterChip.background,
    borderRadius: 10,
    paddingVertical: 8,
  },
  timeModeButtonSelected: {
    backgroundColor: colors.filterChip.backgroundSelected,
  },
  timeModeText: {
    ...typography.label,
    color: colors.filterChip.text,
    fontWeight: '600',
  },
  timeModeTextSelected: {
    color: colors.filterChip.textSelected,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bucketButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.filterChip.background,
    borderRadius: 10,
    paddingVertical: 10,
  },
  bucketButtonSelected: {
    backgroundColor: colors.filterChip.backgroundSelected,
  },
  bucketText: {
    ...typography.label,
    color: colors.filterChip.text,
    fontWeight: '600',
  },
  bucketTextSelected: {
    color: colors.filterChip.textSelected,
  },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  saveButtonText: {
    ...typography.cardTitle,
    color: colors.cardBackground,
  },
});
