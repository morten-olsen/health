import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Surface } from './surface.tsx';
import { Text } from './text.tsx';

const Wrap = ({ children }: { children: ReactNode }): ReactNode => (
  <View style={{ gap: 16, maxWidth: 720 }}>{children}</View>
);

const meta: Meta<typeof Surface> = {
  title: 'Aurora/Primitives/Surface',
  component: Surface,
};

type Story = StoryObj<typeof Surface>;

const Elevations: Story = {
  render: () => (
    <Wrap>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Elevations — graphite layers
      </Text>
      <Text role="body" tone="secondary">
        Depth in Aurora is tone, not shadow. Each layer steps a little closer to the eye —
        never far enough to feel detached.
      </Text>
      {(['base', 'raised', 'card', 'cardRaised'] as const).map((el) => (
        <Surface key={el} elevation={el} padding={24}>
          <Text role="title">{el}</Text>
          <Text role="caption" tone="tertiary">
            elevation = "{el}"
          </Text>
        </Surface>
      ))}
    </Wrap>
  ),
};

const Glows: Story = {
  render: () => (
    <Wrap>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Glows — semantic light
      </Text>
      <Text role="body" tone="secondary">
        A surface only glows when it is carrying state. Glow is the system's
        whisper — never a label, always a presence.
      </Text>
      {(['recover', 'rest', 'strain', 'notice', 'alert'] as const).map((g) => (
        <Surface key={g} elevation="card" padding={24} glow={g}>
          <Text role="title">{g}</Text>
          <Text role="caption" tone="tertiary">
            inner glow tuned to intent.{g}
          </Text>
        </Surface>
      ))}
    </Wrap>
  ),
};

export default meta;
export { Elevations, Glows };
