import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';

import { PulseLine } from './pulse-line.tsx';

const heartRate = [62, 64, 65, 63, 66, 68, 71, 74, 79, 84, 88, 92, 96, 94, 90, 86, 80, 74, 70, 66, 64, 63];
const sleep = [6.2, 6.8, 7.4, 6.9, 7.2, 7.8, 8.1, 7.9, 7.2, 6.8, 6.4, 7.1, 7.5, 7.9, 8.2];
const calm = [42, 44, 48, 52, 50, 47, 45, 43, 40, 38, 41, 44, 48, 52];
const spike = [70, 71, 70, 72, 69, 71, 70, 92, 71, 69, 70, 71, 70];

const meta: Meta<typeof PulseLine> = {
  title: 'Aurora/Data/PulseLine',
  component: PulseLine,
  args: {
    values: heartRate,
    width: 360,
    height: 80,
    tone: 'recover',
    showPoint: true,
    showArea: false,
  },
};

type Story = StoryObj<typeof PulseLine>;

const Playground: Story = {};

const Voices: Story = {
  render: () => (
    <View style={{ gap: 28, maxWidth: 720 }}>
      <View style={{ gap: 8 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Pulse-line — the shape of a number
        </Text>
        <Text role="body" tone="secondary">
          A metric without a line is half a sentence. Aurora draws sparklines with a Catmull-Rom spline (a calm curve,
          no jagged edges), a soft gradient stroke, and a single witness point at the latest value.
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text role="caption" tone="tertiary">
          Heart rate · last 22 minutes
        </Text>
        <PulseLine values={heartRate} tone="strain" height={88} showArea />
      </View>
      <View style={{ gap: 6 }}>
        <Text role="caption" tone="tertiary">
          Sleep · 15 nights
        </Text>
        <PulseLine values={sleep} tone="rest" height={88} showArea />
      </View>
      <View style={{ gap: 6 }}>
        <Text role="caption" tone="tertiary">
          HRV trend · recovering
        </Text>
        <PulseLine values={calm} tone="recover" height={88} showArea />
      </View>
      <View style={{ gap: 6 }}>
        <Text role="caption" tone="tertiary">
          Resting HR · one quiet outlier
        </Text>
        <PulseLine values={spike} tone="notice" height={88} showArea showOutliers />
      </View>
    </View>
  ),
};

const Inline: Story = {
  render: () => (
    <View style={{ gap: 16, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        Inline — quiet, supportive
      </Text>
      <Text role="body" tone="secondary">
        Without a point or area, the line becomes a quiet companion to a numeral.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
        <Text role="bigNumeral">63</Text>
        <View style={{ flex: 1 }}>
          <PulseLine values={heartRate} tone="recover" height={48} showPoint={false} />
        </View>
      </View>
    </View>
  ),
};

export default meta;
export { Playground, Voices, Inline };
