import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ICON_NAMES, Icon } from './icon.tsx';
import { Text } from './text.tsx';

const meta: Meta = {
  title: 'Aurora/Primitives/Icon',
};

type Story = StoryObj;

const Cell = ({ name }: { name: (typeof ICON_NAMES)[number] }): ReactNode => (
  <View
    style={{
      width: 140,
      padding: 20,
      gap: 12,
      alignItems: 'center',
      backgroundColor: '#161922',
      borderRadius: 18,
    }}
  >
    <Icon name={name} size={28} tone="primary" />
    <Text role="micro" tone="tertiary">
      {name}
    </Text>
  </View>
);

const Set: Story = {
  render: () => (
    <View style={{ gap: 24, maxWidth: 920 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Aurora · Icons
        </Text>
        <Text role="display">A small set, drawn by hand.</Text>
        <Text role="body" tone="secondary">
          Monoline. 1.5 stroke. Rounded caps. Generous negative space. We carry our own paths because the icon set is
          part of the system, not a commodity. If a glyph isn't here, ask whether it earns being added — or whether the
          screen needs less.
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {ICON_NAMES.map((name) => (
          <Cell key={name} name={name} />
        ))}
      </View>
    </View>
  ),
};

const Tones: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Tone — color is signal
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {(['primary', 'secondary', 'tertiary', 'rest', 'recover', 'strain', 'notice', 'alert'] as const).map((tone) => (
          <View key={tone} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ padding: 16, backgroundColor: '#161922', borderRadius: 999 }}>
              <Icon name="heart" size={28} tone={tone} />
            </View>
            <Text role="micro" tone="tertiary">
              {tone}
            </Text>
          </View>
        ))}
      </View>
    </View>
  ),
};

export default meta;
export { Set, Tones };
