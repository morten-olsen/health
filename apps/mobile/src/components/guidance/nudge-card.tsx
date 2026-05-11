import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Surface } from '../primitives/surface.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type NudgeTone = Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice'>;

type NudgeCardProps = {
  /** A 1-2 word eyebrow above the message — the *kind* of nudge. */
  kind: string;
  /** The single sentence that earns the user's attention. */
  message: string;
  /** Optional second sentence with grounding evidence. */
  reason?: string;
  /** What the user can do next. Always present — a nudge without an action is a notification. */
  actionLabel: string;
  onPress?: () => void;
  /** A "not now" path. Aurora never forces a yes. */
  dismissLabel?: string;
  onDismiss?: () => void;
  tone?: NudgeTone;
  icon?: IconName;
};

const TONE_COLOR: Record<NudgeTone, string> = {
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
};

const NudgeCard = ({
  kind,
  message,
  reason,
  actionLabel,
  onPress,
  dismissLabel,
  onDismiss,
  tone = 'recover',
  icon = 'spark',
}: NudgeCardProps): ReactNode => {
  const accent = TONE_COLOR[tone];
  return (
    <Surface elevation="card" radius="xl" padding={20} glow={tone}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(242,239,233,0.04)',
            }}
          >
            <Icon name={icon} size={16} tone={tone} />
          </View>
          <Text role="eyebrow" uppercase style={{ color: accent }}>
            {kind}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Text role="heading" tone="primary">
            {message}
          </Text>
          {reason ? (
            <Text role="body" tone="secondary">
              {reason}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={onPress}
            style={{
              backgroundColor: accent,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
            }}
          >
            <Text role="caption" style={{ color: theme.tokens.ink.inverse, fontWeight: '600' }}>
              {actionLabel}
            </Text>
          </Pressable>
          {dismissLabel ? (
            <Pressable
              onPress={onDismiss}
              style={{ paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text role="caption" tone="tertiary">
                {dismissLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Surface>
  );
};

export type { NudgeCardProps, NudgeTone };
export { NudgeCard };
