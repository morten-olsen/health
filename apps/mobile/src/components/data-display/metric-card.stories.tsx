import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';

import { MetricCard } from './metric-card.tsx';

const heartSeries = [62, 64, 65, 63, 66, 68, 71, 74, 79, 84, 88, 92, 96, 94, 90, 86, 80, 74, 70, 66, 64, 63];
const sleepSeries = [6.2, 6.8, 7.4, 6.9, 7.2, 7.8, 8.1, 7.9, 7.2, 6.8, 6.4, 7.1, 7.5, 7.9, 8.2];
const hrvSeries = [42, 44, 48, 52, 50, 47, 45, 43, 40, 38, 41, 44, 48, 52, 58];

const meta: Meta<typeof MetricCard> = {
  title: 'Aurora/Data/MetricCard',
  component: MetricCard,
  args: {
    kind: 'Resting heart rate',
    value: '63',
    unit: 'bpm',
    context: 'A steady morning. Slightly lower than your seven-day median — your body is rested.',
    trend: { direction: 'down', label: '−2 bpm from yesterday' },
    tone: 'recover',
    values: heartSeries,
    icon: 'heart',
    glow: true,
  },
};

type Story = StoryObj<typeof MetricCard>;

const Playground: Story = {};

const Hero: Story = {
  render: () => (
    <View style={{ maxWidth: 420 }}>
      <MetricCard
        kind="Recovery"
        value="72"
        unit="%"
        context="Take the morning gently. There's room for an easy session this afternoon."
        trend={{ direction: 'up', label: '+8 from a hard week' }}
        tone="recover"
        values={hrvSeries}
        icon="ring"
        glow
      />
    </View>
  ),
};

const Set: Story = {
  render: () => (
    <View style={{ gap: 32, maxWidth: 920 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Metric card — the hero of a glance
        </Text>
        <Text role="body" tone="secondary">
          One number, its shape, a sentence of context, a single trend. No more. Cards are the language of the home — a
          small library of them tells you everything about a moment without you having to ask.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 380 }}>
          <MetricCard
            kind="Sleep"
            value="7h 24m"
            context="Longer than your average. Cycles felt complete."
            trend={{ direction: 'up', label: '+18 min vs. 7-day median' }}
            tone="rest"
            values={sleepSeries}
            icon="moon"
          />
        </View>
        <View style={{ flex: 1, minWidth: 380 }}>
          <MetricCard
            kind="Strain"
            value="14.2"
            context="An honest effort. Recovery will catch up tomorrow."
            trend={{ direction: 'up', label: 'Above your weekly average' }}
            tone="strain"
            values={heartSeries}
            icon="flame"
            glow
          />
        </View>
        <View style={{ flex: 1, minWidth: 380 }}>
          <MetricCard
            kind="Resting heart rate"
            value="63"
            unit="bpm"
            context="A steady morning. Slightly lower than your seven-day median."
            trend={{ direction: 'down', label: '−2 bpm from yesterday' }}
            tone="recover"
            values={heartSeries}
            icon="heart"
          />
        </View>
        <View style={{ flex: 1, minWidth: 380 }}>
          <MetricCard
            kind="Hydration"
            value="62"
            unit="%"
            context="The afternoon is the gap you keep skipping."
            trend={{ direction: 'steady', label: 'On par with your week' }}
            tone="notice"
            values={[55, 60, 62, 58, 64, 60, 62]}
            icon="drop"
          />
        </View>
      </View>
    </View>
  ),
};

export default meta;
export { Playground, Hero, Set };
