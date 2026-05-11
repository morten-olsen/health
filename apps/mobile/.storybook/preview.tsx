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
          'Getting Started',
          'Design Tokens',
          'primitives',
          'controls',
          'feedback',
          'layout',
          'navigation',
          'data-display',
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
      default: 'app',
      values: [
        { name: 'app', value: '#0A0A0B' },
        { name: 'surface', value: '#141416' },
        { name: 'light', value: '#FFFFFF' },
      ],
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story: StoryComponent) => (
      <SafeAreaProvider>
        <div
          style={{
            backgroundColor: '#0A0A0B',
            padding: 24,
            width: '100%',
            minHeight: '100vh',
          }}
        >
          <Story />
        </div>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
