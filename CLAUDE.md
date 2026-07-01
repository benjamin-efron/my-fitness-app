# SimpleFitnessApp

A personal workout tracking app for iOS built with Expo + React Native. Targets iOS only via Expo Go during prototyping. No networking — everything is local.

## Tech Stack

- **Expo SDK 56** with Expo Router (file-based routing, `src/app/` directory)
- **React Native 0.85 / React 19**
- **TypeScript 6**
- **AsyncStorage** for all persistence (JSON blobs)
- **react-native-reanimated** and **react-native-gesture-handler** already installed

## Running the App

```bash
npm start        # start Metro bundler, then press 'i' for simulator or scan QR for Expo Go
npm run ios      # start directly targeting iOS simulator
```

## Project Structure

```
src/
  app/           # Expo Router pages and layouts (file = route)
  components/    # Shared UI components
  hooks/         # Custom hooks
  constants/     # Theme, colors, etc.
data/            # Static JSON data (exercise database lives here)
```

## Data & Storage

- **Exercise database**: static JSON file at `data/exercises.json`. Read-only reference data — not persisted via AsyncStorage.
- **All app state** (calibration results, program, workout history) is stored via AsyncStorage as JSON blobs.
- No backend, no networking, no auth.

Install AsyncStorage when needed:
```bash
npx expo install @react-native-async-storage/async-storage
```

## App Sections

### 1. Exercise Calibration
Walk through exercises from the database, perform a calibration set, and record stats per exercise:
- Mental effort rating
- Time taken to perform
- Any other relevant calibration notes
Calibration results stored in AsyncStorage keyed by exercise ID.

### 2. Program Builder
Build a workout program from calibrated exercises. Supports both create and edit flows. A program is an ordered list of exercises with sets/reps/rest targets. Stored in AsyncStorage.

### 3. Workout Tracker
Execute a workout session based on the active program. Track reps, sets, weight, and time per exercise in real time. Save completed sessions to AsyncStorage.

### 4. History Viewer
Browse past workout sessions. Show basic stats and graphs of progress over time (per exercise, per session).

## Development Approach

- **Vibe-coded prototyping phase** — prioritize shipping working UI over perfect architecture
- iOS only — do not add Android-specific code or workarounds
- Use Expo Go for development; no native build needed yet
- Avoid over-abstracting — keep data flow simple and co-located until patterns emerge naturally
- Use the existing theme system (`src/constants/theme.ts`) for colors and typography
