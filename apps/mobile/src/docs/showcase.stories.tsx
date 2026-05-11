import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../components/controls/button.tsx';
import { Chip } from '../components/controls/chip.tsx';
import { Segmented } from '../components/controls/segmented.tsx';
import { MetricCard } from '../components/data-display/metric-card.tsx';
import { MetricPill } from '../components/data-display/metric-pill.tsx';
import { PulseLine } from '../components/data-display/pulse-line.tsx';
import { Ring } from '../components/data-display/ring.tsx';
import { Tag } from '../components/data-display/tag.tsx';
import { PulseDot } from '../components/feedback/pulse-dot.tsx';
import { JourneyStep } from '../components/guidance/journey-step.tsx';
import { NudgeCard } from '../components/guidance/nudge-card.tsx';
import { StreakThread } from '../components/guidance/streak-thread.tsx';
import { Icon } from '../components/primitives/icon.tsx';
import { Surface } from '../components/primitives/surface.tsx';
import { Text } from '../components/primitives/text.tsx';
import { theme } from '../shared/theme/theme.ts';

const meta: Meta = {
  title: 'Aurora/Showcase',
  parameters: {
    layout: 'fullscreen',
  },
};

type Story = StoryObj;

const heartSeries = [62, 63, 61, 62, 64, 63, 65, 64, 62, 60, 61, 63, 62, 61];
const sleepSeries = [6.2, 7.2, 6.8, 7.5, 7.1, 6.9, 7.4, 7.8, 7.6, 8.1, 7.5, 7.8, 8.0, 7.9];

const StatusBar = (): ReactNode => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 4,
    }}
  >
    <Text role="micro" tone="primary" style={{ fontWeight: '600' }}>
      9:41
    </Text>
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Icon name="pulse" size={14} tone="tertiary" />
      <Icon name="drop" size={14} tone="tertiary" />
      <Text role="micro" tone="tertiary">
        100%
      </Text>
    </View>
  </View>
);

const Greeting = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 6 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <PulseDot tone="recover" size={6} />
      <Text role="eyebrow" tone="tertiary" uppercase>
        Saturday · A quiet morning
      </Text>
    </View>
    <Text role="display">Good morning,</Text>
    <Text role="display" style={{ color: theme.tokens.intent.recover }}>
      Morten.
    </Text>
  </View>
);

const HeroRing = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 32, alignItems: 'center', gap: 18 }}>
    <Ring progress={0.74} size={260} thickness={18} tone="recover" />
    <View style={{ position: 'absolute', top: 32 + (260 - 90) / 2, alignItems: 'center' }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Recovery
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text
          role="heroNumeral"
          style={
            {
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "wght" 350',
              fontSize: 84,
              lineHeight: 84,
              letterSpacing: -3,
            } as unknown as Record<string, unknown>
          }
        >
          74
        </Text>
        <Text role="title" tone="tertiary">
          %
        </Text>
      </View>
    </View>
    <Text role="body" tone="secondary" align="center" style={{ maxWidth: 320 }}>
      You're rested. Today is the right day for the longer run you've been circling all week.
    </Text>
  </View>
);

const PillRow = (): ReactNode => (
  <View
    style={{
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 32,
      flexWrap: 'wrap',
    }}
  >
    <MetricPill icon="heart" label="Resting" value="61" unit="bpm" tone="recover" />
    <MetricPill icon="moon" label="Slept" value="7h 48m" tone="rest" />
    <MetricPill icon="ring" label="HRV" value="58" unit="ms" tone="recover" />
    <MetricPill icon="steps" label="Steps" value="2,140" tone="recover" />
  </View>
);

const TodaysFocus = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 40, gap: 16 }}>
    <Text role="eyebrow" tone="tertiary" uppercase>
      Today's thread
    </Text>
    <NudgeCard
      tone="recover"
      kind="An invitation"
      icon="spark"
      message="Take the longer route this morning."
      reason="Your HRV is up 8% on the week. A 40-minute easy run lands cleanly today."
      actionLabel="Start a session"
      dismissLabel="Maybe later"
    />
  </View>
);

const SleepSection = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 40, gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ gap: 4 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Sleep
        </Text>
        <Text role="display">Two weeks of rest</Text>
      </View>
      <Tag label="Improving" tone="recover" />
    </View>
    <Surface elevation="card" radius="xl" padding={24}>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
          <Text role="bigNumeral">7h 48m</Text>
          <Text role="caption" tone="tertiary">
            last night
          </Text>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="arrow-up-right" size={14} tone="recover" />
            <Text role="caption" style={{ color: theme.tokens.intent.recover, fontWeight: '600' }}>
              +18 min
            </Text>
          </View>
        </View>
        <PulseLine values={sleepSeries} tone="rest" height={64} showArea />
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Chip label="Deep · 1h 24m" tone="rest" selected />
          <Chip label="REM · 2h 03m" tone="recover" selected />
          <Chip label="Light · 4h 18m" />
        </View>
      </View>
    </Surface>
  </View>
);

const HeartSection = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 32, gap: 12 }}>
    <MetricCard
      kind="Heart"
      value="61"
      unit="bpm at rest"
      context="Your resting heart rate is a half-beat slower than your seven-day median. A small but honest sign that yesterday's rest worked."
      trend={{ direction: 'down', label: '−2 bpm from yesterday' }}
      tone="recover"
      values={heartSeries}
      icon="heart"
      glow
    />
  </View>
);

const JourneyPreview = (): ReactNode => (
  <View style={{ paddingHorizontal: 24, paddingTop: 40, gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ gap: 4 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          This week
        </Text>
        <Text role="display">Easing back in</Text>
      </View>
      <Button label="Open" variant="quiet" trailingIcon="chevron-right" />
    </View>
    <Surface elevation="card" radius="xl" padding={24}>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 8 }}>
          <Text role="caption" tone="tertiary">
            Sleep window — 7 days
          </Text>
          <StreakThread
            tone="rest"
            todayIndex={3}
            labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']}
            days={['met', 'met', 'near', 'met', 'future', 'future', 'future']}
          />
        </View>
        <View
          style={{
            height: 1,
            backgroundColor: theme.tokens.surface.hairline,
            marginVertical: 8,
          }}
        />
        <JourneyStep state="past" title="Two short walks" detail="Mon & Tue — completed" />
        <JourneyStep state="now" icon="spark" title="A longer run today" detail="40 minutes, easy" />
        <JourneyStep state="next" title="A rest day tomorrow" detail="Sleep is the work" showThread={false} />
      </View>
    </Surface>
  </View>
);

const ExplorationFooter = (): ReactNode => {
  const [view, setView] = useState<'today' | 'week' | 'year'>('today');
  return (
    <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 16 }}>
      <Segmented<'today' | 'week' | 'year'>
        value={view}
        onChange={setView}
        options={[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'Week' },
          { id: 'year', label: 'Year' },
        ]}
      />
      <Text role="caption" tone="tertiary" align="center">
        Aurora · v0.1 · Calm by default
      </Text>
    </View>
  );
};

const Phone = ({ children }: { children: ReactNode }): ReactNode => (
  <View
    style={
      {
        width: '100%',
        maxWidth: 440,
        borderRadius: 48,
        backgroundColor: theme.tokens.surface.base,
        borderWidth: 1,
        borderColor: theme.tokens.surface.hairlineStrong,
        overflow: 'hidden',
        boxShadow:
          '0 60px 120px -24px rgba(0,0,0,0.6), 0 24px 48px -12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(242,239,233,0.04)',
      } as unknown as Record<string, unknown>
    }
  >
    <View
      style={
        {
          backgroundImage:
            'radial-gradient(ellipse 600px 400px at 50% -10%, rgba(127, 231, 181, 0.10), transparent 70%), radial-gradient(ellipse 400px 300px at 100% 100%, rgba(168, 139, 255, 0.06), transparent 70%)',
        } as unknown as Record<string, unknown>
      }
    >
      {children}
    </View>
  </View>
);

const Home: Story = {
  render: () => (
    <View
      style={{
        // @ts-expect-error — web-only background gradient.
        backgroundImage:
          'radial-gradient(ellipse 1400px 700px at 50% -10%, rgba(127, 231, 181, 0.05), transparent 60%), radial-gradient(ellipse 800px 600px at 0% 100%, rgba(168, 139, 255, 0.04), transparent 60%)',
        minHeight: '100vh',
        paddingVertical: 56,
        alignItems: 'center',
        gap: 56,
      }}
    >
      <View style={{ maxWidth: 720, alignItems: 'center', gap: 12, paddingHorizontal: 24 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Aurora · Showcase
        </Text>
        <Text role="display" align="center">
          A morning, in one glance.
        </Text>
        <Text role="body" tone="secondary" align="center" style={{ maxWidth: 540 }}>
          The home screen is a single conversation, top to bottom. It opens with how you are, suggests what to do, and
          only then offers the longer threads. Most days end at the third scroll.
        </Text>
      </View>
      <Phone>
        <StatusBar />
        <Greeting />
        <HeroRing />
        <PillRow />
        <TodaysFocus />
        <SleepSection />
        <HeartSection />
        <JourneyPreview />
        <ExplorationFooter />
      </Phone>
    </View>
  ),
};

export default meta;
export { Home };
