import type { ReactNode } from 'react';
import { Platform, Text as RNText } from 'react-native';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { TypeRoleName } from '../../shared/theme/theme.ts';

type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'rest'
  | 'recover'
  | 'strain'
  | 'notice'
  | 'alert';

type TextProps = {
  role?: TypeRoleName;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
  children: ReactNode;
  className?: string;
  style?: RNTextProps['style'];
  numberOfLines?: number;
  accessibilityRole?: RNTextProps['accessibilityRole'];
};

const TONE_COLOR: Record<TextTone, string> = {
  primary: theme.tokens.ink.primary,
  secondary: theme.tokens.ink.secondary,
  tertiary: theme.tokens.ink.tertiary,
  inverse: theme.tokens.ink.inverse,
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const Text = ({
  role = 'body',
  tone = 'primary',
  align = 'left',
  uppercase = false,
  children,
  className,
  style,
  numberOfLines,
  accessibilityRole,
}: TextProps): ReactNode => {
  const spec = theme.typography.role[role];
  const baseStyle: TextStyle = {
    fontFamily: spec.family,
    fontSize: spec.size,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    fontWeight: spec.weight as TextStyle['fontWeight'],
    color: TONE_COLOR[tone],
    textAlign: align,
    textTransform: uppercase ? 'uppercase' : 'none',
  };
  // Variable-font axes only apply on web; quietly drop on native.
  const variation = 'fontVariationSettings' in spec ? spec.fontVariationSettings : undefined;
  const variableStyle =
    Platform.OS === 'web' && variation
      ? ({ fontVariationSettings: variation } as unknown as TextStyle)
      : undefined;
  return (
    <RNText
      style={[baseStyle, variableStyle, style]}
      className={className}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </RNText>
  );
};

export type { TextProps, TextTone };
export { Text };
