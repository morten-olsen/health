import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';

import { Button } from './button.tsx';

const meta: Meta<typeof Button> = {
  title: 'Aurora/Controls/Button',
  component: Button,
  args: {
    label: 'Begin',
    variant: 'primary',
    size: 'md',
    tone: 'neutral',
    disabled: false,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'soft', 'ghost', 'quiet'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'inline-radio', options: ['neutral', 'recover', 'strain', 'notice', 'alert'] },
  },
};

type Story = StoryObj<typeof Button>;

const Playground: Story = {};

const Row = ({ children, label }: { children: ReactNode; label: string }): ReactNode => (
  <View style={{ gap: 12 }}>
    <Text role="eyebrow" tone="tertiary" uppercase>
      {label}
    </Text>
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>{children}</View>
  </View>
);

const Variants: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 720 }}>
      <Row label="Primary — commit to an action">
        <Button label="Begin a session" variant="primary" />
        <Button label="Recover" variant="primary" tone="recover" />
        <Button label="Push" variant="primary" tone="strain" />
      </Row>
      <Row label="Soft — invitations, not demands">
        <Button label="Add a note" variant="soft" icon="plus" />
        <Button label="Log mood" variant="soft" tone="recover" />
        <Button label="Investigate" variant="soft" tone="notice" />
      </Row>
      <Row label="Ghost — peripheral options">
        <Button label="Skip" variant="ghost" />
        <Button label="Connect device" variant="ghost" icon="plus" />
      </Row>
      <Row label="Quiet — list rows, navigation">
        <Button label="See your week" variant="quiet" trailingIcon="chevron-right" />
        <Button label="Read more" variant="quiet" trailingIcon="arrow-up-right" />
      </Row>
      <Row label="Sizes">
        <Button label="Small" size="sm" />
        <Button label="Medium" size="md" />
        <Button label="Large" size="lg" />
      </Row>
      <Row label="State">
        <Button label="Disabled" disabled />
      </Row>
    </View>
  ),
};

export default meta;
export { Playground, Variants };
