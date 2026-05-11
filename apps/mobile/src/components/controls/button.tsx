import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonTone = 'neutral' | 'recover' | 'strain' | 'notice' | 'alert';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  icon?: IconName;
  trailingIcon?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
};

const TONE_COLOR: Record<ButtonTone, string> = {
  neutral: theme.tokens.ink.primary,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const SIZE_PAD: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };
const SIZE_RADIUS: Record<ButtonSize, number> = {
  sm: theme.tokens.radius.md,
  md: theme.tokens.radius.lg,
  lg: theme.tokens.radius.xl,
};
const SIZE_ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

const hexToRgba = (hex: string, alpha: number): string => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const variantStyle = (
  variant: ButtonVariant,
  tone: ButtonTone,
  pressed: boolean,
): { container: ViewStyle; textColor: string } => {
  const toneColor = TONE_COLOR[tone];
  if (variant === 'primary') {
    return {
      container: {
        backgroundColor: tone === 'neutral' ? theme.tokens.ink.primary : toneColor,
        opacity: pressed ? 0.88 : 1,
      },
      textColor: theme.tokens.ink.inverse,
    };
  }
  if (variant === 'soft') {
    return {
      container: {
        backgroundColor: pressed
          ? hexToRgba(toneColor, 0.24)
          : hexToRgba(toneColor, 0.14),
      },
      textColor: tone === 'neutral' ? theme.tokens.ink.primary : toneColor,
    };
  }
  if (variant === 'ghost') {
    return {
      container: {
        backgroundColor: pressed ? theme.tokens.surface.card : 'transparent',
        borderWidth: 1,
        borderColor: theme.tokens.surface.hairlineStrong,
      },
      textColor: tone === 'neutral' ? theme.tokens.ink.primary : toneColor,
    };
  }
  // quiet — no chrome at all, just text + (optional) icon, used in lists
  return {
    container: {
      backgroundColor: pressed ? theme.tokens.surface.hairline : 'transparent',
    },
    textColor: tone === 'neutral' ? theme.tokens.ink.secondary : toneColor,
  };
};

const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  tone = 'neutral',
  icon,
  trailingIcon,
  disabled = false,
  fullWidth = false,
}: ButtonProps): ReactNode => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const v = variantStyle(variant, tone, pressed);
        return [
          {
            height: SIZE_HEIGHT[size],
            paddingHorizontal: SIZE_PAD[size],
            borderRadius: SIZE_RADIUS[size],
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            opacity: disabled ? 0.36 : 1,
          } as ViewStyle,
          v.container,
          Platform.OS === 'web'
            ? ({
                transition: `background-color ${theme.motion.duration.flick}ms ${theme.motion.easing.glide}, transform ${theme.motion.duration.flick}ms ${theme.motion.easing.glide}`,
                transform: pressed ? 'scale(0.98)' : 'scale(1)',
              } as unknown as ViewStyle)
            : null,
        ];
      }}
    >
      {({ pressed }: { pressed: boolean }): ReactNode => {
        const v = variantStyle(variant, tone, pressed);
        return (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {icon ? <Icon name={icon} size={SIZE_ICON[size]} tone="primary" style={{ opacity: 0.95 }} /> : null}
            <Text
              role={size === 'lg' ? 'title' : 'body'}
              style={{ color: v.textColor, fontWeight: '600' }}
            >
              {label}
            </Text>
            {trailingIcon ? (
              <Icon name={trailingIcon} size={SIZE_ICON[size]} tone="primary" style={{ opacity: 0.85 }} />
            ) : null}
          </View>
        );
      }}
    </Pressable>
  );
};

export type { ButtonProps, ButtonVariant, ButtonSize, ButtonTone };
export { Button };
