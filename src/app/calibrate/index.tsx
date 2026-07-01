import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getAllCalibrations } from '@/lib/calibration-storage';
import { exercises, muscleGroupLabel } from '@/lib/exercises';
import type { Exercise } from '@/types/exercise';

export default function CalibrateList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [calibratedIds, setCalibratedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllCalibrations().then((all) => {
        if (!cancelled) {
          setCalibratedIds(new Set(Object.keys(all)));
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(query));
  }, [search]);

  const renderItem = ({ item }: { item: Exercise }) => {
    const isCalibrated = calibratedIds.has(item.id);
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push(`/calibrate/${item.id}`)}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowSubtitle}>
            {item.equipment} · {item.primary_muscle_groups.map(muscleGroupLabel).join(', ')}
          </Text>
        </View>
        {isCalibrated && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    margin: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999999',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#2E9E4A',
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
    marginLeft: 16,
  },
});
