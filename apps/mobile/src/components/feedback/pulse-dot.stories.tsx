import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';

import { PulseDot } from './pulse-dot.tsx';

const meta: Meta<typeof PulseDot> = {
  title: 'Aurora/Feedback/PulseDot',
  component: PulseDot,
};

type Story = StoryObj<typeof PulseDot>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 24, maxWidth: 720 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Pulse dot — a presence, not a notification
        </Text>
        <Text role="body" tone="secondary">
          The breath is the system's quietest signal — "something is happening here" without claiming your attention.
          Used for live values, fresh data, or active sessions.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
        {(['rest', 'recover', 'strain', 'notice', 'alert'] as const).map((tone) => (
          <View key={tone} style={{ alignItems: 'center', gap: 8 }}>
            <PulseDot tone={tone} />
            <Text role="micro" tone="tertiary">
              {tone}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <PulseDot tone="strain" size={10} />
        <Text role="body" tone="secondary">
          Live · session in progress
        </Text>
      </View>
    </View>
  ),
};

export default meta;
export { Set };
