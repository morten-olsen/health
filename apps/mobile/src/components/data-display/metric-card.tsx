import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Surface } from '../primitives/surface.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';

import { PulseLine } from './pulse-line.tsx';
import type { PulseLineTone } from './pulse-line.tsx';

type Trend = {
  direction: 'up' | 'down' | 'steady';
  /** Human-readable delta — e.g. "+4 bpm" or "−12 min from your 7-day median". */
  label: string;
};

type MetricCardProps = {
  /** What the metric *is*. Quiet — sits at the top in eyebrow weight. */
  kind: string;
  /** The number itself, ready to display. */
  value: string;
  /** Unit, rendered small and tertiary. */
  unit?: string;
  /** A single sentence of context. */
  context?: string;
  /** A glance trend — tone is chosen by the caller; Aurora doesn't editorialize. */
  trend?: Trend;
  /** Tone — sets the sparkline color and the optional glow. */
  tone?: PulseLineTone;
  /** Historical shape — the soul of the card. */
  values?: number[];
  /** Optional accent icon (heart, moon, etc.) — lives in the eyebrow row. */
  icon?: IconName;
  /** Show ambient inner glow tuned to tone. */
  glow?: boolean;
};

const TREND_ICON: Record<Trend['direction'], IconName> = {
  up: 'arrow-up-right',
  down: 'arrow-down-right',
  steady: 'pulse',
};

const TONE_COLOR: Record<PulseLineTone, string> = {
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const TrendRow = ({ trend, tone }: { trend: Trend; tone: PulseLineTone }): ReactNode => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Icon name={TREND_ICON[trend.direction]} size={14} tone={tone} />
    <Text role="caption" style={{ color: TONE_COLOR[tone], fontWeight: '600' }}>
      {trend.label}
    </Text>
  </View>
);

const MetricCard = ({
  kind,
  value,
  unit,
  context,
  trend,
  tone = 'recover',
  values,
  icon,
  glow = false,
}: MetricCardProps): ReactNode => {
  return (
    <Surface elevation="card" radius="xl" glow={glow ? tone : 'none'} padding={24}>
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Icon name={icon} size={14} tone="tertiary" /> : null}
          <Text role="eyebrow" tone="tertiary" uppercase>
            {kind}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text role="heroNumeral">{value}</Text>
          {unit ? (
            <Text role="caption" tone="tertiary" style={{ marginBottom: 14 }}>
              {unit}
            </Text>
          ) : null}
        </View>

        {values && values.length > 1 ? <PulseLine values={values} tone={tone} height={56} showArea /> : null}

        {(context || trend) && (
          <View style={{ gap: 8 }}>
            {trend ? <TrendRow trend={trend} tone={tone} /> : null}
            {context ? (
              <Text role="body" tone="secondary">
                {context}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Surface>
  );
};

export type { MetricCardProps, Trend };
export { MetricCard };
