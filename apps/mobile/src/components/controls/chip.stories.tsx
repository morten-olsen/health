import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { Chip } from './chip.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof Chip> = {
  title: 'Aurora/Controls/Chip',
  component: Chip,
};

type Story = StoryObj<typeof Chip>;

const Filters = (): ReactNode => {
  const [selected, setSelected] = useState<string>('today');
  const options = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
    { id: 'year', label: 'This year' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={o.label}
          selected={selected === o.id}
          onPress={() => setSelected(o.id)}
        />
      ))}
    </View>
  );
};

const Examples: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 720 }}>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Filter
        </Text>
        <Filters />
      </View>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Tag (semantic)
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="Resting" tone="rest" selected icon="moon" />
          <Chip label="In range" tone="recover" selected icon="check" />
          <Chip label="Peak" tone="strain" selected icon="flame" />
          <Chip label="Outlier" tone="notice" selected icon="spark" />
          <Chip label="Watch" tone="alert" selected icon="pulse" />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Unselected
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="Workouts" />
          <Chip label="Sleep" />
          <Chip label="Heart" />
          <Chip label="Mood" />
        </View>
      </View>
    </View>
  ),
};

export default meta;
export { Examples };
