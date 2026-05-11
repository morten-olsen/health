import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '../components/primitives/text.tsx';
import { theme } from '../shared/theme/theme.ts';
import type { DurationName, EasingName } from '../shared/theme/theme.ts';

const meta: Meta = {
  title: 'Aurora/Tokens/Motion',
};

type Story = StoryObj;

const DURATION_DESC: Record<DurationName, string> = {
  instant: 'state changes that should not animate at all (data refresh in place).',
  flick: 'mechanical interactions — toggle thumb, chip select, button press.',
  gentle: 'the default. Transitions, dismissals, reveals — almost everything.',
  breath: 'data-bearing reveals — sparklines drawing, rings filling.',
  tide: 'slow ambient loops. The pulse, the breath, the still-here.',
  arrival: 'first-glance entrances. A new screen, a card landing.',
};

const EASING_DESC: Record<EasingName, string> = {
  glide: "Aurora's default. A smooth ease that lets the eye land softly.",
  arrive: 'Entrances — gentle landing, eye-led.',
  dive: 'Exits — a quick lift-off.',
  spring: 'Stretched-and-released — toggles, magnetic snaps.',
  steady: 'Linear. Only for true continuous motion (shimmer, pulse).',
};

const MotionDemo = ({
  duration,
  easing,
  active,
}: {
  duration: number;
  easing: string;
  active: boolean;
}): ReactNode => (
  <View
    style={{
      width: 280,
      height: 56,
      borderRadius: 999,
      backgroundColor: theme.tokens.surface.raised,
      borderWidth: 1,
      borderColor: theme.tokens.surface.hairline,
      padding: 4,
    }}
  >
    <View
      style={[
        {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.tokens.intent.recover,
        },
        {
          // @ts-expect-error — web-only.
          transition: `transform ${duration}ms ${easing}`,
          transform: active ? 'translateX(220px)' : 'translateX(0)',
        },
      ]}
    />
  </View>
);

const DurationRow = ({
  name,
  ms,
  active,
}: {
  name: DurationName;
  ms: number;
  active: boolean;
}): ReactNode => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
    <View style={{ width: 160, gap: 4 }}>
      <Text role="title">{name}</Text>
      <Text role="micro" tone="tertiary">
        {ms}ms
      </Text>
    </View>
    <MotionDemo duration={ms} easing={theme.motion.easing.glide} active={active} />
    <Text role="caption" tone="tertiary" style={{ flex: 1, maxWidth: 320 }}>
      {DURATION_DESC[name]}
    </Text>
  </View>
);

const EasingRow = ({
  name,
  curve,
  active,
}: {
  name: EasingName;
  curve: string;
  active: boolean;
}): ReactNode => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
    <View style={{ width: 160, gap: 4 }}>
      <Text role="title">{name}</Text>
      <Text role="mono" tone="tertiary">
        {curve}
      </Text>
    </View>
    <MotionDemo
      duration={theme.motion.duration.breath}
      easing={curve}
      active={active}
    />
    <Text role="caption" tone="tertiary" style={{ flex: 1, maxWidth: 320 }}>
      {EASING_DESC[name]}
    </Text>
  </View>
);

const VocabularyView = (): ReactNode => {
  const [active, setActive] = useState(false);
  return (
      <View style={{ gap: 40, maxWidth: 1100 }}>
        <View style={{ gap: 10 }}>
          <Text role="eyebrow" tone="tertiary" uppercase>
            Aurora · Motion
          </Text>
          <Text role="display">Motion is body language.</Text>
          <Text role="body" tone="secondary" style={{ maxWidth: 640 }}>
            We name motion for the feeling it should leave behind, never for its
            duration in milliseconds. Tap the button to replay every motion at
            once — try to feel which is which.
          </Text>
          <Pressable
            onPress={() => setActive((v) => !v)}
            style={{
              alignSelf: 'flex-start',
              marginTop: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: theme.tokens.ink.primary,
            }}
          >
            <Text role="caption" style={{ color: theme.tokens.ink.inverse, fontWeight: '600' }}>
              {active ? 'Reset' : 'Play all motions'}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 20 }}>
          <Text role="eyebrow" tone="tertiary" uppercase>
            Durations
          </Text>
          <DurationRow name="flick" ms={theme.motion.duration.flick} active={active} />
          <DurationRow name="gentle" ms={theme.motion.duration.gentle} active={active} />
          <DurationRow name="breath" ms={theme.motion.duration.breath} active={active} />
          <DurationRow name="arrival" ms={theme.motion.duration.arrival} active={active} />
          <DurationRow name="tide" ms={theme.motion.duration.tide} active={active} />
        </View>

        <View style={{ gap: 20 }}>
          <Text role="eyebrow" tone="tertiary" uppercase>
            Easings
          </Text>
          <EasingRow name="glide" curve={theme.motion.easing.glide} active={active} />
          <EasingRow name="arrive" curve={theme.motion.easing.arrive} active={active} />
          <EasingRow name="dive" curve={theme.motion.easing.dive} active={active} />
          <EasingRow name="spring" curve={theme.motion.easing.spring} active={active} />
        </View>
      </View>
  );
};

const Vocabulary: Story = {
  render: () => <VocabularyView />,
};

export default meta;
export { Vocabulary };
