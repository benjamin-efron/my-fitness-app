import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const SECTIONS = [
  { href: '/calibrate' as const, label: 'Exercise Calibration', enabled: true },
  { href: null, label: 'Program Builder', enabled: false },
  { href: null, label: 'Workout Tracker', enabled: false },
  { href: null, label: 'History Viewer', enabled: false },
];

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SimpleFitness</Text>
      <View style={styles.sectionList}>
        {SECTIONS.map((section) =>
          section.enabled && section.href ? (
            <Link key={section.label} href={section.href} asChild>
              <Pressable>
                <Text style={styles.sectionLink}>{section.label}</Text>
              </Pressable>
            </Link>
          ) : (
            <Text key={section.label} style={styles.sectionDisabled}>
              {section.label} (coming soon)
            </Text>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  sectionList: {
    gap: 16,
    alignItems: 'center',
  },
  sectionLink: {
    fontSize: 18,
    color: '#208AEF',
  },
  sectionDisabled: {
    fontSize: 18,
    color: '#999999',
  },
});
