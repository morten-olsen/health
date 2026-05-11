import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';

type ChipTone = 'neutral' | 'rest' | 'recover' | 'strain' | 'notice' | 'alert';

type ChipProps = {
  label: string;
  icon?: IconName;
  tone?: ChipTone;
  selected?: boolean;
  onPress?: () => void;
};

const TONE_COLOR: Record<ChipTone, string> = {
  neutral: theme.tokens.ink.primary,
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const hexToRgba = (hex: string, alpha: number): string => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Chip = ({
  label,
  icon,
  tone = 'neutral',
  selected = false,
  onPress,
}: ChipProps): ReactNode => {
  const tc = TONE_COLOR[tone];
  return (
    <Pressable onPress={onPress}>
      {({ pressed }: { pressed: boolean }): ReactNode => {
        const bg = selected
          ? tone === 'neutral'
            ? theme.tokens.ink.primary
            : hexToRgba(tc, 0.18)
          : pressed
            ? theme.tokens.surface.card
            : 'transparent';
        const borderColor = selected
          ? tone === 'neutral'
            ? 'transparent'
            : hexToRgba(tc, 0.4)
          : theme.tokens.surface.hairlineStrong;
        const textColor = selected
          ? tone === 'neutral'
            ? theme.tokens.ink.inverse
            : tc
          : theme.tokens.ink.secondary;
        return (
          <View
            style={[
              {
                height: 32,
                paddingHorizontal: 14,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor,
              },
              Platform.OS === 'web'
                ? ({
                    transition: `all ${theme.motion.duration.gentle}ms ${theme.motion.easing.glide}`,
                  } as unknown as ViewStyle)
                : null,
            ]}
          >
            {icon ? (
              <Icon
                name={icon}
                size={14}
                tone={selected ? (tone === 'neutral' ? 'inverse' : tone === 'rest' ? 'rest' : tone === 'recover' ? 'recover' : tone === 'strain' ? 'strain' : tone === 'notice' ? 'notice' : 'alert') : 'tertiary'}
              />
            ) : null}
            <Text role="caption" style={{ color: textColor, fontWeight: '500' }}>
              {label}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
};

export type { ChipProps, ChipTone };
export { Chip };
