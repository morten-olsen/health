import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Tag } from './tag.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof Tag> = {
  title: 'Aurora/Data/Tag',
  component: Tag,
};

type Story = StoryObj<typeof Tag>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Tag — a quiet label
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Tag label="Easy" tone="rest" />
        <Tag label="Recovered" tone="recover" />
        <Tag label="Peak" tone="strain" />
        <Tag label="Outlier" tone="notice" />
        <Tag label="Alert" tone="alert" />
        <Tag label="Manual" />
      </View>
    </View>
  ),
};

export default meta;
export { Set };
