import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteCalibration, getCalibration, saveCalibration } from '@/lib/calibration-storage';
import { getExerciseById, muscleGroupLabel } from '@/lib/exercises';

const EFFORT_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export default function CalibrateExercise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const exercise = getExerciseById(id);

  const [effortRating, setEffortRating] = useState<number | null>(null);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState('');
  const [notes, setNotes] = useState('');
  const [hasExistingCalibration, setHasExistingCalibration] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCalibration(id).then((existing) => {
      if (existing) {
        setEffortRating(existing.effortRating);
        setTimeTakenSeconds(String(existing.timeTakenSeconds));
        setNotes(existing.notes);
        setHasExistingCalibration(true);
      }
    });
  }, [id]);

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text>Exercise not found.</Text>
      </View>
    );
  }

  const canSave = effortRating !== null && timeTakenSeconds.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || effortRating === null) return;
    await saveCalibration({
      exerciseId: exercise.id,
      effortRating,
      timeTakenSeconds: Number(timeTakenSeconds),
      notes: notes.trim(),
      calibratedAt: new Date().toISOString(),
    });
    router.back();
  };

  const handleClear = () => {
    Alert.alert('Clear calibration', `Remove calibration data for ${exercise.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await deleteCalibration(exercise.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {exercise.equipment} · {exercise.primary_muscle_groups.map(muscleGroupLabel).join(', ')}
        </Text>
        {exercise.secondary_muscle_groups.length > 0 && (
          <Text style={styles.secondary}>
            Secondary: {exercise.secondary_muscle_groups.map(muscleGroupLabel).join(', ')}
          </Text>
        )}

        <Text style={styles.label}>Mental effort (1 = easy, 10 = maximal)</Text>
        <View style={styles.effortRow}>
          {EFFORT_SCALE.map((value) => (
            <Pressable
              key={value}
              style={[styles.effortButton, effortRating === value && styles.effortButtonSelected]}
              onPress={() => setEffortRating(value)}
            >
              <Text
                style={[
                  styles.effortButtonText,
                  effortRating === value && styles.effortButtonTextSelected,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Time taken (seconds)</Text>
        <TextInput
          style={styles.input}
          value={timeTakenSeconds}
          onChangeText={setTimeTakenSeconds}
          keyboardType="number-pad"
          placeholder="e.g. 45"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Form cues, equipment setup, anything worth remembering"
          multiline
        />

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Save calibration</Text>
        </Pressable>

        {hasExistingCalibration && (
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear calibration</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
  },
  secondary: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  effortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  effortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  effortButtonSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  effortButtonText: {
    fontSize: 15,
  },
  effortButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999999',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 28,
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A9CFEF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#D33',
    fontSize: 15,
  },
});
