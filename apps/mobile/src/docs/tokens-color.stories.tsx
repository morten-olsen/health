import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../components/primitives/text.tsx';
import { theme } from '../shared/theme/theme.ts';

const meta: Meta = {
  title: 'Aurora/Tokens/Color',
};

type Story = StoryObj;

const Swatch = ({ name, value, bg }: { name: string; value: string; bg?: string }): ReactNode => (
  <View style={{ width: 200, gap: 8 }}>
    <View
      style={{
        height: 96,
        borderRadius: 16,
        backgroundColor: bg ?? value,
        borderWidth: 1,
        borderColor: 'rgba(242,239,233,0.06)',
      }}
    />
    <View style={{ gap: 2 }}>
      <Text role="caption" style={{ fontWeight: '600' }}>
        {name}
      </Text>
      <Text role="micro" tone="tertiary">
        {value}
      </Text>
    </View>
  </View>
);

const SwatchRow = ({
  title,
  description,
  swatches,
}: {
  title: string;
  description?: string;
  swatches: { name: string; value: string; bg?: string }[];
}): ReactNode => (
  <View style={{ gap: 20 }}>
    <View style={{ gap: 6, maxWidth: 720 }}>
      <Text role="eyebrow" tone="tertiary" uppercase>
        {title}
      </Text>
      {description ? (
        <Text role="body" tone="secondary">
          {description}
        </Text>
      ) : null}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {swatches.map((s) => (
        <Swatch key={s.name} name={s.name} value={s.value} bg={s.bg} />
      ))}
    </View>
  </View>
);

const Palette: Story = {
  render: () => (
    <View style={{ gap: 48, maxWidth: 1100 }}>
      <View style={{ gap: 10 }}>
        <Text role="eyebrow" tone="tertiary" uppercase>
          Aurora · Color
        </Text>
        <Text role="display">Color is signal.</Text>
        <Text role="body" tone="secondary" style={{ maxWidth: 640 }}>
          The palette has two registers. Graphite and paper handle structure — they're the air the system breathes in.
          The five glow colors handle meaning — they only appear where they say something the user needs to read.
        </Text>
      </View>

      <SwatchRow
        title="Graphite — surfaces"
        description="Depth is tone. Each layer steps a hair closer to the eye."
        swatches={[
          { name: 'abyss', value: theme.tokens.surface.abyss },
          { name: 'base', value: theme.tokens.surface.base },
          { name: 'raised', value: theme.tokens.surface.raised },
          { name: 'card', value: theme.tokens.surface.card },
          { name: 'card-raised', value: theme.tokens.surface.cardRaised },
          { name: 'edge', value: theme.tokens.surface.edge },
        ]}
      />

      <SwatchRow
        title="Paper — ink"
        description="Warm off-white, never clinical. Aurora reads on the eye, not against it."
        swatches={[
          { name: 'primary', value: theme.tokens.ink.primary },
          { name: 'secondary', value: theme.tokens.ink.secondary, bg: theme.tokens.surface.card },
          { name: 'tertiary', value: theme.tokens.ink.tertiary, bg: theme.tokens.surface.card },
          { name: 'hush', value: theme.tokens.ink.quaternary, bg: theme.tokens.surface.card },
          { name: 'ghost', value: theme.tokens.ink.ghost, bg: theme.tokens.surface.card },
        ]}
      />

      <SwatchRow
        title="Glow — semantic intent"
        description="Five colors, each with a precise meaning. The user learns to read them as fluency, not decoration."
        swatches={[
          { name: 'rest · tide blue', value: theme.tokens.intent.rest },
          { name: 'recover · aurora green', value: theme.tokens.intent.recover },
          { name: 'strain · plasma violet', value: theme.tokens.intent.strain },
          { name: 'notice · solar amber', value: theme.tokens.intent.notice },
          { name: 'alert · ember coral', value: theme.tokens.intent.alert },
        ]}
      />

      <SwatchRow
        title="Glow — deep variants"
        description="Used as gradient endpoints inside rings and pulse-lines. Never as a fill on their own."
        swatches={[
          { name: 'rest-deep', value: theme.tokens.intent.restDeep },
          { name: 'recover-deep', value: theme.tokens.intent.recoverDeep },
          { name: 'strain-deep', value: theme.tokens.intent.strainDeep },
          { name: 'notice-deep', value: theme.tokens.intent.noticeDeep },
          { name: 'alert-deep', value: theme.tokens.intent.alertDeep },
        ]}
      />
    </View>
  ),
};

export default meta;
export { Palette };
