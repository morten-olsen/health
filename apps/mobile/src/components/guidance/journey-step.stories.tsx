import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { JourneyStep } from './journey-step.tsx';
import { Surface } from '../primitives/surface.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof JourneyStep> = {
  title: 'Aurora/Guidance/JourneyStep',
  component: JourneyStep,
};

type Story = StoryObj<typeof JourneyStep>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 20, maxWidth: 520 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Journey step — a stop on a longer path
        </Text>
        <Text role="body" tone="secondary">
          The connective tissue of Aurora's future guidance. A program, a couch-to-5K,
          a return from injury — each one is a thread of small steps, never a leaderboard.
        </Text>
      </View>
      <Surface elevation="card" radius="xl" padding={24}>
        <View style={{ gap: 4 }}>
          <Text role="eyebrow" tone="tertiary" uppercase>
            This week
          </Text>
          <Text role="display" style={{ marginBottom: 16 }}>
            Easing back in
          </Text>
          <JourneyStep
            state="past"
            title="Two short walks"
            detail="Monday & Tuesday — completed"
          />
          <JourneyStep
            state="past"
            title="One easy run"
            detail="Wednesday — 24 minutes, calm"
          />
          <JourneyStep
            state="now"
            icon="spark"
            title="A longer run today"
            detail="35 minutes at an easy pace — your body is ready"
          />
          <JourneyStep state="next" title="A rest day tomorrow" detail="Sleep is the work" />
          <JourneyStep
            state="future"
            title="A first interval session"
            detail="Sunday, only if recovery holds"
            showThread={false}
          />
        </View>
      </Surface>
    </View>
  ),
};

export default meta;
export { Set };
