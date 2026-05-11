import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../components/primitives/text.tsx';
import { theme } from '../shared/theme/theme.ts';

const meta: Meta = {
  title: 'Aurora/Tokens/Spacing',
};

type Story = StoryObj;

const SpaceRow = ({ name, value }: { name: string; value: number }): ReactNode => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
    <View style={{ width: 80 }}>
      <Text role="mono" tone="secondary">
        space.{name}
      </Text>
    </View>
    <View style={{ width: 80 }}>
      <Text role="caption" tone="tertiary">
        {value}px
      </Text>
    </View>
    <View
      style={{
        height: 16,
        width: value,
        backgroundColor: theme.tokens.intent.recover,
        borderRadius: 4,
        opacity: 0.85,
      }}
    />
  </View>
);

const RadiusBlock = ({ name, value }: { name: string; value: number }): ReactNode => (
  <View style={{ alignItems: 'center', gap: 8 }}>
    <View
      style={{
        width: 80,
        height: 80,
        backgroundColor: theme.tokens.surface.cardRaised,
        borderRadius: value,
        borderWidth: 1,
        borderColor: theme.tokens.surface.hairlineStrong,
      }}
    />
    <Text role="mono" tone="tertiary">
      radius.{name}
    </Text>
    <Text role="micro" tone="tertiary">
      {value}px
    </Text>
  </View>
);

const Scale: Story = {
  render: () => (
    <View style={{ gap: 48, maxWidth: 900 }}>
      <View style={{ gap: 10 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Aurora · Spacing & Radius
        </Text>
        <Text role="display">A soft progression.</Text>
        <Text role="body" tone="secondary" style={{ maxWidth: 640 }}>
          Spacing isn't a strict 4 or 8 grid. Tighter at small sizes — where space
          reads as breath — looser at large, where it reads as composition.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Space
        </Text>
        {(
          [
            ['1', theme.tokens.space[1]],
            ['2', theme.tokens.space[2]],
            ['3', theme.tokens.space[3]],
            ['4', theme.tokens.space[4]],
            ['5', theme.tokens.space[5]],
            ['6', theme.tokens.space[6]],
            ['7', theme.tokens.space[7]],
            ['8', theme.tokens.space[8]],
            ['9', theme.tokens.space[9]],
            ['10', theme.tokens.space[10]],
            ['11', theme.tokens.space[11]],
            ['12', theme.tokens.space[12]],
            ['13', theme.tokens.space[13]],
          ] as const
        ).map(([name, value]) => (
          <SpaceRow key={name} name={String(name)} value={value} />
        ))}
      </View>
      <View style={{ gap: 16 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Radius
        </Text>
        <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
          <RadiusBlock name="xs" value={theme.tokens.radius.xs} />
          <RadiusBlock name="sm" value={theme.tokens.radius.sm} />
          <RadiusBlock name="md" value={theme.tokens.radius.md} />
          <RadiusBlock name="lg" value={theme.tokens.radius.lg} />
          <RadiusBlock name="xl" value={theme.tokens.radius.xl} />
          <RadiusBlock name="2xl" value={theme.tokens.radius['2xl']} />
        </View>
      </View>
    </View>
  ),
};

export default meta;
export { Scale };
