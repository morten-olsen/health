import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type JourneyState = 'past' | 'now' | 'next' | 'future';

type JourneyStepProps = {
  title: string;
  detail?: string;
  state?: JourneyState;
  icon?: IconName;
  tone?: Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice'>;
  /** Whether to render the connector line below this step. */
  showThread?: boolean;
};

const STATE_COLOR: Record<JourneyState, string> = {
  past: 'rgba(127, 231, 181, 0.5)',
  now: theme.tokens.intent.recover,
  next: theme.tokens.ink.primary,
  future: theme.tokens.surface.edge,
};

const JourneyStep = ({
  title,
  detail,
  state = 'next',
  icon = 'check',
  tone = 'recover',
  showThread = true,
}: JourneyStepProps): ReactNode => {
  const isNow = state === 'now';
  const isPast = state === 'past';
  const dotColor = isNow ? theme.tokens.intent[tone] : STATE_COLOR[state];
  const titleTone =
    state === 'future' ? 'tertiary' : state === 'past' ? 'secondary' : 'primary';
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center', width: 28 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isNow
              ? 'rgba(127, 231, 181, 0.12)'
              : 'transparent',
            borderWidth: isNow ? 0 : 1,
            borderColor: dotColor,
          }}
        >
          {isPast ? (
            <Icon name="check" size={14} tone="recover" />
          ) : isNow ? (
            <Icon name={icon} size={14} tone={tone} />
          ) : (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: dotColor,
              }}
            />
          )}
        </View>
        {showThread ? (
          <View
            style={{
              flex: 1,
              width: 1,
              backgroundColor: state === 'past' || isNow
                ? 'rgba(127, 231, 181, 0.32)'
                : theme.tokens.surface.hairlineStrong,
              marginTop: 6,
              minHeight: 28,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: showThread ? 24 : 0, gap: 4 }}>
        <Text role="title" tone={titleTone}>
          {title}
        </Text>
        {detail ? (
          <Text role="caption" tone="tertiary">
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export type { JourneyState, JourneyStepProps };
export { JourneyStep };
