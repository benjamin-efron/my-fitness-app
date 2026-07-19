import { fireEvent, render, screen } from '@testing-library/react-native';

import Index from './index';

const mockPush = jest.fn();

/**
 * `Link` is mocked the same way `router.push` is mocked in
 * `calibrate/index.test.tsx` and `useLocalSearchParams` in
 * `calibrate/[id].test.tsx` — the real `expo-router` navigator needs a
 * root layout/route table to resolve `href`s, which is unrelated to
 * what this screen owns. The stub renders `href` as a pressable text
 * node so the test can assert on what a user actually perceives
 * (a link they can tap) without standing up real navigation.
 */
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <Text accessibilityRole="link" onPress={() => mockPush(href)}>
        {children}
      </Text>
    ),
  };
});

describe('Index', () => {
  afterEach(() => {
    mockPush.mockClear();
  });

  it('renders a link to the exercise calibration list', () => {
    render(<Index />);

    expect(screen.getByRole('link')).toBeOnTheScreen();
  });

  it('navigates to /calibrate when the link is pressed', () => {
    render(<Index />);

    fireEvent.press(screen.getByRole('link'));

    expect(mockPush).toHaveBeenCalledWith('/calibrate');
  });
});
