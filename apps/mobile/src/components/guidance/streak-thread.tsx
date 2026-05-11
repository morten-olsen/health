import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type StreakState = 'met' | 'near' | 'missed' | 'rest' | 'future';

type StreakThreadProps = {
  /** Sequence of days, oldest → newest. */
  days: StreakState[];
  /** Optional label per day (single character — letter or number). */
  labels?: string[];
  /** Index that should be marked "today" with a brighter ring. */
  todayIndex?: number;
  tone?: Extract<Intent, 'recover' | 'rest' | 'strain'>;
};

const STATE_COLOR: Record<StreakState, string> = {
  met: theme.tokens.intent.recover,
  near: 'rgba(127, 231, 181, 0.32)',
  missed: theme.tokens.surface.edge,
  rest: theme.tokens.intent.rest,
  future: 'rgba(242, 239, 233, 0.06)',
};

const StreakThread = ({
  days,
  labels,
  todayIndex,
  tone = 'recover',
}: StreakThreadProps): ReactNode => {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {days.map((d, i) => {
          const isToday = i === todayIndex;
          const color = d === 'met' ? theme.tokens.intent[tone] : STATE_COLOR[d];
          return (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: color,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: theme.tokens.ink.primary,
                  opacity: d === 'future' ? 0.5 : 1,
                }}
              />
              {labels && labels[i] ? (
                <Text
                  role="micro"
                  tone={isToday ? 'primary' : 'tertiary'}
                  style={{ fontWeight: isToday ? '600' : '400' }}
                >
                  {labels[i]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export type { StreakState, StreakThreadProps };
export { StreakThread };
