import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Ring } from './ring.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof Ring> = {
  title: 'Aurora/Data/Ring',
  component: Ring,
  args: {
    progress: 0.72,
    size: 220,
    thickness: 18,
    tone: 'recover',
    label: 'Recovery',
    value: '72',
    unit: '%',
  },
};

type Story = StoryObj<typeof Ring>;

const Playground: Story = {};

const Family: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 920 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Ring — the shape of completion
        </Text>
        <Text role="body" tone="secondary">
          Rings carry one number, the one that wants its own room. The gradient
          isn't decoration — it tells you *which* shape of progress you're
          looking at without naming it.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 32, flexWrap: 'wrap' }}>
        <Ring progress={0.84} tone="recover" label="Recovery" value="84" unit="%" />
        <Ring progress={0.42} tone="rest" label="Sleep" value="6h 12m" />
        <Ring progress={0.91} tone="strain" label="Strain" value="14.2" />
        <Ring progress={0.27} tone="notice" label="Hydration" value="27" unit="%" />
        <Ring progress={0.55} tone="alert" label="Resting HR" value="68" unit="bpm" />
      </View>
    </View>
  ),
};

const Sizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <Ring progress={0.65} size={72} thickness={8} tone="recover" />
      <Ring progress={0.65} size={120} thickness={12} tone="recover" />
      <Ring progress={0.65} size={180} thickness={16} tone="recover" value="65" unit="%" />
      <Ring progress={0.65} size={240} thickness={20} tone="recover" label="Today" value="65" unit="%" />
    </View>
  ),
};

export default meta;
export { Playground, Family, Sizes };
