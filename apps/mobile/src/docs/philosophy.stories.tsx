import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../components/primitives/text.tsx';
import { PulseDot } from '../components/feedback/pulse-dot.tsx';
import { Surface } from '../components/primitives/surface.tsx';
import { theme } from '../shared/theme/theme.ts';

const meta: Meta = {
  title: 'Aurora/Philosophy',
  parameters: {
    layout: 'fullscreen',
  },
};

type Story = StoryObj;

type Principle = {
  number: string;
  name: string;
  oneLine: string;
  body: string;
  color: string;
};

const PRINCIPLES: Principle[] = [
  {
    number: '01',
    name: 'Journey',
    oneLine: 'Health is a path, not a score.',
    body: "Every screen acknowledges the user's continuity. A number is a stop, not a destination. The system carries the user forward — never asks them to defend a streak or chase a target. We display data in service of a longer arc; we display nothing that doesn't earn its place on that arc.",
    color: theme.tokens.intent.recover,
  },
  {
    number: '02',
    name: 'Hush',
    oneLine: 'Quiet by default.',
    body: "The screen exhales before it inhales. We open with negative space, with a single sentence, with one breath. Density is earned by exploration, never imposed at the door. The first glance should leave the user feeling calmer than the moment they opened the app — even if the news is hard.",
    color: theme.tokens.intent.rest,
  },
  {
    number: '03',
    name: 'Glow',
    oneLine: 'Color is meaning.',
    body: "Every coloured pixel says something. Aurora green is recovery; tide blue is rest; plasma is push; solar is notice; ember is alert. Surfaces and chrome are graphite and paper. We never use color to decorate, only to inform — and the language stays consistent so the user learns to read it like fluency.",
    color: theme.tokens.intent.strain,
  },
  {
    number: '04',
    name: 'Lift',
    oneLine: 'Depth via motion, not weight.',
    body: "Heavy shadows and heavy chrome are how products shout. We don't shout. Depth comes from how things move — how a card lands, how a number scrubs into place, how a ring fills. Motion is the system's body language; the user reads it without naming it.",
    color: theme.tokens.intent.notice,
  },
  {
    number: '05',
    name: 'Trace',
    oneLine: 'Every number has a shape.',
    body: "A metric without a line beside it is half a sentence. The sparkline is the soul of a data point — it's the difference between knowing a value and knowing a story. We resist the temptation to display numbers alone, except where the absence is itself the point.",
    color: theme.tokens.intent.alert,
  },
];

const Hero = (): ReactNode => (
  <View
    style={{
      paddingVertical: 96,
      gap: 40,
      maxWidth: 920,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <PulseDot tone="recover" size={6} />
      <Text role="eyebrow" tone="tertiary" uppercase>
        Aurora · A design system for health
      </Text>
    </View>
    <Text
      role="display"
      style={
        {
          fontSize: 96,
          lineHeight: 92,
          letterSpacing: -4,
          fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 350',
        } as unknown as Record<string, unknown>
      }
    >
      Calm by default.
      {'\n'}
      Aware by design.
    </Text>
    <Text role="heading" tone="secondary" style={{ maxWidth: 640, fontWeight: '400' }}>
      An open alternative to the closed health platforms. Aurora is a visual
      language for moving through your life — not a dashboard to manage it.
      The interface is a companion: quiet when there's nothing to say,
      luminous when there is.
    </Text>
  </View>
);

const PrincipleRow = ({ p, index }: { p: Principle; index: number }): ReactNode => {
  const isReversed = index % 2 === 1;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 64,
        paddingVertical: 56,
        borderTopWidth: 1,
        borderTopColor: theme.tokens.surface.hairline,
      }}
    >
      <View style={{ width: 200, gap: 12 }}>
        <Text
          role="mono"
          style={{ color: p.color, letterSpacing: 4, fontWeight: '600' }}
        >
          {p.number}
        </Text>
        <Text
          role="display"
          style={
            {
              fontSize: 56,
              lineHeight: 60,
              letterSpacing: -1.5,
              color: p.color,
              fontVariationSettings: '"opsz" 96, "SOFT" 80, "wght" 400',
            } as unknown as Record<string, unknown>
          }
        >
          {p.name}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 18, maxWidth: 540 }}>
        <Text
          role="heading"
          style={
            {
              fontFamily: theme.typography.family.display,
              fontSize: 28,
              lineHeight: 36,
              letterSpacing: -0.6,
              fontWeight: '400',
              fontVariationSettings: '"opsz" 36, "SOFT" 60, "wght" 400',
            } as unknown as Record<string, unknown>
          }
        >
          {p.oneLine}
        </Text>
        <Text role="body" tone="secondary" style={{ fontSize: 16, lineHeight: 26 }}>
          {p.body}
        </Text>
      </View>
    </View>
  );
};

const Practices = (): ReactNode => (
  <View
    style={{
      paddingVertical: 96,
      borderTopWidth: 1,
      borderTopColor: theme.tokens.surface.hairline,
      gap: 32,
    }}
  >
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        How we work
      </Text>
      <Text role="display">Five rules that come from the principles.</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      {[
        {
          title: 'Open with one thing',
          body: 'Every screen earns its second element. The first is the answer to "what do I need to know right now?"',
        },
        {
          title: 'Numbers carry shape',
          body: 'A value rarely travels alone. Pair it with a sparkline, a delta, or a thread back to context.',
        },
        {
          title: 'Color is signal',
          body: 'A coloured pixel says something. If you find yourself using color for taste, switch it to ink.',
        },
        {
          title: 'Motion is depth',
          body: 'Reveal with motion, never with weight. If a shadow can be replaced by a gentle entrance, do it.',
        },
        {
          title: 'Honor rest',
          body: "Missed days aren't failure. Aurora reads them as recovery — and the visual language follows.",
        },
        {
          title: 'No leaderboards',
          body: "Aurora compares you only to yourself. Other people's bodies are not a measuring stick.",
        },
      ].map((r) => (
        <Surface
          key={r.title}
          elevation="card"
          radius="xl"
          padding={28}
          style={{ flex: 1, minWidth: 280, maxWidth: 360 }}
        >
          <Text role="title" style={{ marginBottom: 8 }}>
            {r.title}
          </Text>
          <Text role="body" tone="secondary">
            {r.body}
          </Text>
        </Surface>
      ))}
    </View>
  </View>
);

const Closing = (): ReactNode => (
  <View
    style={{
      paddingVertical: 96,
      borderTopWidth: 1,
      borderTopColor: theme.tokens.surface.hairline,
      gap: 24,
      maxWidth: 720,
    }}
  >
    <Text role="eyebrow" tone="tertiary" uppercase>
      The road ahead
    </Text>
    <Text role="display">
      Today, a glance.{'\n'}Tomorrow, a companion.
    </Text>
    <Text role="body" tone="secondary">
      Aurora begins as a way to see what's happening in your body. It grows
      into a way to move through your life with that knowledge gently held —
      programs, easings, returns from rest, the small turns that compose a
      year of health. The system is built so that the day we add coaching
      to the surface, none of the language has to change.
    </Text>
  </View>
);

const Document: Story = {
  render: () => (
    <View
      style={{
        paddingHorizontal: 64,
        paddingBottom: 96,
        maxWidth: 1200,
        marginHorizontal: 'auto',
      }}
    >
      <Hero />
      <View>
        {PRINCIPLES.map((p, i) => (
          <PrincipleRow key={p.number} p={p} index={i} />
        ))}
      </View>
      <Practices />
      <Closing />
    </View>
  ),
};

export default meta;
export { Document };
