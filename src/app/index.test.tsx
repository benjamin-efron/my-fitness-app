import { render, screen } from '@testing-library/react-native';

import Index from './index';

describe('Index', () => {
  it('renders the hello world greeting', () => {
    render(<Index />);

    expect(screen.getByText('Hello, world!')).toBeOnTheScreen();
  });
});
