import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { Toggle } from './toggle.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof Toggle> = {
  title: 'Aurora/Controls/Toggle',
  component: Toggle,
};

type Story = StoryObj<typeof Toggle>;

const Row = ({
  label,
  description,
  tone,
}: {
  label: string;
  description: string;
  tone?: 'recover' | 'rest' | 'strain' | 'notice' | 'alert' | 'neutral';
}): ReactNode => {
  const [value, setValue] = useState(true);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: '#161922',
        borderRadius: 18,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text role="title">{label}</Text>
        <Text role="caption" tone="tertiary">
          {description}
        </Text>
      </View>
      <Toggle value={value} onChange={setValue} tone={tone} />
    </View>
  );
};

const Examples: Story = {
  render: () => (
    <View style={{ gap: 12, maxWidth: 520 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Settings — toggle
      </Text>
      <Row
        label="Sleep window"
        description="Aurora will keep an eye on consistency"
        tone="rest"
      />
      <Row
        label="Daily nudges"
        description="Gentle prompts at the right moment, never more"
        tone="recover"
      />
      <Row
        label="Push to the edge"
        description="Surface peak-effort windows when ready"
        tone="strain"
      />
      <Row
        label="High-heart alerts"
        description="Tell me when something looks unusual"
        tone="alert"
      />
    </View>
  ),
};

export default meta;
export { Examples };
