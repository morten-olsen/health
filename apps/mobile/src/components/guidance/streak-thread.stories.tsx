import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { StreakThread } from './streak-thread.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof StreakThread> = {
  title: 'Aurora/Guidance/StreakThread',
  component: StreakThread,
};

type Story = StoryObj<typeof StreakThread>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 520 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Streak thread — continuity, not a score
        </Text>
        <Text role="body" tone="secondary">
          A streak is a thread you've been carrying — not a number to break or
          defend. Missed days are honored as rest, not as failure. Today is
          marked with a ring so the eye knows where it stands.
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text role="caption" tone="tertiary">
          This week — sleep window
        </Text>
        <StreakThread
          tone="rest"
          todayIndex={3}
          labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']}
          days={['met', 'met', 'near', 'met', 'future', 'future', 'future']}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text role="caption" tone="tertiary">
          Two weeks — daily movement
        </Text>
        <StreakThread
          tone="recover"
          todayIndex={10}
          days={[
            'met',
            'met',
            'rest',
            'met',
            'met',
            'met',
            'rest',
            'met',
            'near',
            'met',
            'met',
            'future',
            'future',
            'future',
          ]}
        />
      </View>
    </View>
  ),
};

export default meta;
export { Set };
