import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type MetricPillTone = Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice' | 'alert'>;

type MetricPillProps = {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  tone?: MetricPillTone;
};

const TONE: Record<MetricPillTone, string> = {
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const MetricPill = ({ label, value, unit, icon, tone = 'recover' }: MetricPillProps): ReactNode => {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: theme.tokens.surface.card,
        borderWidth: 1,
        borderColor: theme.tokens.surface.hairline,
        minWidth: 160,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(242,239,233,0.04)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={18} tone={tone} />
        </View>
      ) : null}
      <View style={{ gap: 2 }}>
        <Text role="micro" tone="tertiary" uppercase style={{ color: TONE[tone] }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text role="numeral">{value}</Text>
          {unit ? (
            <Text role="caption" tone="tertiary">
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export type { MetricPillProps, MetricPillTone };
export { MetricPill };
