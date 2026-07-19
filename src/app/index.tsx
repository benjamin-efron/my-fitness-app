import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

/**
 * Home screen — entry point of the app (`spec.md`'s "0. Home screen
 * entry point"). Just a link into Exercise Calibration for now: no
 * other app section (Program Builder, Workout Tracker, History
 * Viewer) exists yet, so this isn't a navigation menu.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Link href="/calibrate" style={styles.link}>
        Start Exercise Calibration
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  link: {
    ...typography.cardTitle,
    color: colors.text,
  },
});
