import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { MetricPill } from './metric-pill.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof MetricPill> = {
  title: 'Aurora/Data/MetricPill',
  component: MetricPill,
};

type Story = StoryObj<typeof MetricPill>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Metric pill — quiet, dense, glanceable
      </Text>
      <Text role="body" tone="secondary">
        For rows of supporting numbers. Smaller than a card, bigger than a chip —
        the unit you'd line up beneath a hero card to fill in the rest of a story.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <MetricPill icon="heart" label="Resting" value="63" unit="bpm" tone="recover" />
        <MetricPill icon="moon" label="Sleep" value="7h 24m" tone="rest" />
        <MetricPill icon="flame" label="Strain" value="14.2" tone="strain" />
        <MetricPill icon="drop" label="Hydration" value="62" unit="%" tone="notice" />
        <MetricPill icon="lung" label="VO₂" value="48" tone="recover" />
        <MetricPill icon="steps" label="Steps" value="8,412" tone="recover" />
      </View>
    </View>
  ),
};

export default meta;
export { Set };
