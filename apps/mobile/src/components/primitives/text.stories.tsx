import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text.tsx';
import type { TypeRoleName } from '../../shared/theme/theme.ts';

const ROLES: TypeRoleName[] = [
  'heroNumeral',
  'bigNumeral',
  'numeral',
  'display',
  'heading',
  'title',
  'body',
  'caption',
  'eyebrow',
  'micro',
  'mono',
];

const ROLE_LABEL: Record<TypeRoleName, string> = {
  heroNumeral: 'Hero numeral · Fraunces 96 / opsz · soft 30',
  bigNumeral: 'Big numeral · Fraunces 56',
  numeral: 'Numeral · Fraunces 28',
  display: 'Display · Fraunces 40',
  heading: 'Heading · Geist 22 semibold',
  title: 'Title · Geist 16 semibold',
  body: 'Body · Geist 15',
  caption: 'Caption · Geist 13',
  eyebrow: 'Eyebrow · Geist 11 +1.4 tracked',
  micro: 'Micro · Geist 11',
  mono: 'Mono · Geist Mono 12',
};

const ROLE_SAMPLE: Record<TypeRoleName, string> = {
  heroNumeral: '72',
  bigNumeral: '8,412',
  numeral: '142 bpm',
  display: 'Today',
  heading: 'Recovery — your week',
  title: 'Sleep · 7h 24m',
  body: 'You slept longer than your seven-day average. Take the morning gently.',
  caption: 'Updated 2 minutes ago',
  eyebrow: 'This morning',
  micro: 'Synced 06:42',
  mono: '06:42:18',
};

const Specimen = ({ role }: { role: TypeRoleName }): ReactNode => {
  return (
    <View style={{ paddingVertical: 16, gap: 8 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        {ROLE_LABEL[role]}
      </Text>
      <Text role={role}>{ROLE_SAMPLE[role]}</Text>
    </View>
  );
};

const meta: Meta = {
  title: 'Aurora/Tokens/Typography',
};

type Story = StoryObj;

const Specimens: Story = {
  render: () => (
    <View style={{ maxWidth: 720, gap: 24 }}>
      <View style={{ gap: 8, marginBottom: 16 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Aurora · Type
        </Text>
        <Text role="display">A type system you read with your body, not your eye.</Text>
        <Text role="body" tone="secondary">
          Two families, deliberately matched. Fraunces — variable serif, optical sizing,
          warmth axis — for any number that wants to be a shape. Geist for everything
          functional. Tabular figures, always.
        </Text>
      </View>
      <View
        style={{
          height: 1,
          backgroundColor: 'rgba(242, 239, 233, 0.06)',
          marginVertical: 8,
        }}
      />
      {ROLES.map((role) => (
        <Specimen key={role} role={role} />
      ))}
    </View>
  ),
};

const Tones: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Tone — semantic ink
      </Text>
      <Text role="heading" tone="primary">
        Primary — your sleep was longer than average
      </Text>
      <Text role="heading" tone="secondary">
        Secondary — supporting copy and context
      </Text>
      <Text role="heading" tone="tertiary">
        Tertiary — metadata and timestamps
      </Text>
      <Text role="heading" tone="rest">
        Rest — a calm, low-intensity signal
      </Text>
      <Text role="heading" tone="recover">
        Recover — restored and in range
      </Text>
      <Text role="heading" tone="strain">
        Strain — push, peak, effort
      </Text>
      <Text role="heading" tone="notice">
        Notice — worth a glance
      </Text>
      <Text role="heading" tone="alert">
        Alert — threshold crossed
      </Text>
    </View>
  ),
};

export default meta;
export { Specimens, Tones };
