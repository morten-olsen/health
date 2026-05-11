import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';

import { RangeBar } from './range-bar.tsx';

const meta: Meta<typeof RangeBar> = {
  title: 'Aurora/Data/RangeBar',
  component: RangeBar,
};

type Story = StoryObj<typeof RangeBar>;

const Examples: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 520 }}>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Heart-rate zones
        </Text>
        <Text role="title">Where you sat, this session</Text>
        <RangeBar
          height={12}
          marker={0.62}
          markerLabel="142 bpm"
          showLabels
          zones={[
            { size: 1, tone: 'rest', label: 'Calm' },
            { size: 1, tone: 'recover', label: 'Easy' },
            { size: 2, tone: 'strain', label: 'Push' },
            { size: 1, tone: 'notice', label: 'Hard' },
            { size: 0.6, tone: 'alert', label: 'Max' },
          ]}
        />
      </View>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Recovery band
        </Text>
        <Text role="title">Where today landed</Text>
        <RangeBar
          height={10}
          marker={0.74}
          markerLabel="74"
          zones={[
            { size: 1, tone: 'alert' },
            { size: 1, tone: 'notice' },
            { size: 2, tone: 'recover' },
          ]}
        />
      </View>
    </View>
  ),
};

export default meta;
export { Examples };
