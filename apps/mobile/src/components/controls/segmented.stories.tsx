import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { Segmented } from './segmented.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof Segmented> = {
  title: 'Aurora/Controls/Segmented',
  component: Segmented,
};

type Story = StoryObj<typeof Segmented>;

type Span = 'day' | 'week' | 'month' | 'year';

const Example = (): ReactNode => {
  const [value, setValue] = useState<Span>('week');
  return (
    <Segmented<Span>
      value={value}
      onChange={setValue}
      options={[
        { id: 'day', label: 'D' },
        { id: 'week', label: 'W' },
        { id: 'month', label: 'M' },
        { id: 'year', label: 'Y' },
      ]}
    />
  );
};

const TwoUp = (): ReactNode => {
  const [v, setV] = useState<'metrics' | 'journey'>('metrics');
  return (
    <Segmented<'metrics' | 'journey'>
      value={v}
      onChange={setV}
      options={[
        { id: 'metrics', label: 'Metrics' },
        { id: 'journey', label: 'Journey' },
      ]}
    />
  );
};

const Examples: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 520 }}>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Span — time window
        </Text>
        <Example />
      </View>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Surface — two large modes
        </Text>
        <TwoUp />
      </View>
    </View>
  ),
};

export default meta;
export { Examples };
