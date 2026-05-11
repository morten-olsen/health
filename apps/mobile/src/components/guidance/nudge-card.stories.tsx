import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { NudgeCard } from './nudge-card.tsx';
import { Text } from '../primitives/text.tsx';

const meta: Meta<typeof NudgeCard> = {
  title: 'Aurora/Guidance/NudgeCard',
  component: NudgeCard,
};

type Story = StoryObj<typeof NudgeCard>;

const Set: Story = {
  render: () => (
    <View style={{ gap: 20, maxWidth: 480 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Nudge — a quiet hand on the shoulder
        </Text>
        <Text role="body" tone="secondary">
          Nudges are the system's way of carrying the Journey forward. They earn
          their attention with a single sentence, ground themselves in a reason,
          and always offer both a yes and a not-now.
        </Text>
      </View>
      <NudgeCard
        tone="recover"
        kind="Recovery looks good"
        icon="spark"
        message="An easy 30-minute walk would settle today nicely."
        reason="Your HRV is up 8% and you slept 24 minutes longer than your seven-day median."
        actionLabel="Start a walk"
        dismissLabel="Later"
      />
      <NudgeCard
        tone="rest"
        kind="Wind down"
        icon="moon"
        message="It's an hour before your usual sleep window."
        reason="You've trended later three nights running. A small reset tonight pays for the week."
        actionLabel="Begin wind-down"
        dismissLabel="Not tonight"
      />
      <NudgeCard
        tone="strain"
        kind="Push window"
        icon="flame"
        message="You're rested enough for a peak-effort session."
        reason="Last three days have been easy; today is when a hard one lands cleanest."
        actionLabel="See suggestions"
        dismissLabel="Skip"
      />
      <NudgeCard
        tone="notice"
        kind="Worth a glance"
        icon="pulse"
        message="Your resting heart rate has run high for two mornings."
        reason="Could be sleep, could be a brewing cold. Aurora flags, never diagnoses."
        actionLabel="See the trend"
        dismissLabel="Dismiss"
      />
    </View>
  ),
};

export default meta;
export { Set };
