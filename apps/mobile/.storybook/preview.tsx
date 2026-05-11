import type { Preview } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

type StoryComponent = () => ReactNode;

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Aurora',
          [
            'Philosophy',
            'Tokens',
            ['Color', 'Typography', 'Motion', 'Spacing'],
            'Showcase',
            'Primitives',
            ['Text', 'Surface', 'Icon'],
            'Controls',
            ['Button', 'Chip', 'Toggle', 'Segmented'],
            'Data',
            ['MetricCard', 'MetricPill', 'Ring', 'PulseLine', 'RangeBar', 'Tag'],
            'Guidance',
            ['NudgeCard', 'JourneyStep', 'StreakThread'],
            'Feedback',
            ['PulseDot', 'EmptyState'],
          ],
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'base',
      values: [
        { name: 'abyss', value: '#070809' },
        { name: 'base', value: '#0A0B0E' },
        { name: 'raised', value: '#101217' },
        { name: 'card', value: '#161922' },
        { name: 'paper', value: '#F2EFE9' },
      ],
    },
    layout: 'fullscreen',
    docs: {
      toc: { headingSelector: 'h2, h3' },
    },
  },
  decorators: [
    (Story: StoryComponent) => (
      <SafeAreaProvider>
        <div
          style={{
            backgroundColor: '#0A0B0E',
            backgroundImage:
              // Subtle aurora wash — a barely-visible horizon gradient.
              'radial-gradient(ellipse 1200px 600px at 50% -10%, rgba(127, 231, 181, 0.04), transparent 60%), radial-gradient(ellipse 800px 500px at 10% 110%, rgba(168, 139, 255, 0.03), transparent 60%)',
            color: '#F2EFE9',
            padding: '48px 32px',
            width: '100%',
            minHeight: '100vh',
            fontFamily:
              '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Story />
        </div>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
