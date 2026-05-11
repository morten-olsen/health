import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type SurfaceElevation = 'base' | 'raised' | 'card' | 'cardRaised';
type SurfaceRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type SurfaceGlow = Intent | 'none';

type SurfaceProps = {
  elevation?: SurfaceElevation;
  radius?: SurfaceRadius;
  hairline?: boolean;
  glow?: SurfaceGlow;
  padding?: number;
  style?: ViewStyle;
  className?: string;
  children?: ReactNode;
};

const BG: Record<SurfaceElevation, string> = {
  base: theme.tokens.surface.base,
  raised: theme.tokens.surface.raised,
  card: theme.tokens.surface.card,
  cardRaised: theme.tokens.surface.cardRaised,
};

const RADIUS: Record<SurfaceRadius, number> = {
  none: 0,
  sm: theme.tokens.radius.sm,
  md: theme.tokens.radius.md,
  lg: theme.tokens.radius.lg,
  xl: theme.tokens.radius.xl,
  '2xl': theme.tokens.radius['2xl'],
};

const GLOW_COLOR: Record<Intent, string> = {
  rest: theme.tokens.intent.rest,
  restDeep: theme.tokens.intent.restDeep,
  recover: theme.tokens.intent.recover,
  recoverDeep: theme.tokens.intent.recoverDeep,
  strain: theme.tokens.intent.strain,
  strainDeep: theme.tokens.intent.strainDeep,
  notice: theme.tokens.intent.notice,
  noticeDeep: theme.tokens.intent.noticeDeep,
  alert: theme.tokens.intent.alert,
  alertDeep: theme.tokens.intent.alertDeep,
};

const hexToRgba = (hex: string, alpha: number): string => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Surface = ({
  elevation = 'card',
  radius = 'lg',
  hairline = true,
  glow = 'none',
  padding,
  style,
  className,
  children,
}: SurfaceProps): ReactNode => {
  const glowStyle: ViewStyle | undefined =
    glow !== 'none'
      ? ({
          boxShadow: `inset 0 0 32px -8px ${hexToRgba(GLOW_COLOR[glow], 0.22)}, 0 0 40px -8px ${hexToRgba(GLOW_COLOR[glow], 0.15)}`,
        } as unknown as ViewStyle)
      : undefined;
  const hairlineStyle: ViewStyle | undefined = hairline
    ? {
        borderWidth: 1,
        borderColor: theme.tokens.surface.hairline,
      }
    : undefined;
  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: BG[elevation],
          borderRadius: RADIUS[radius],
          padding,
        },
        hairlineStyle,
        glowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export type { SurfaceProps, SurfaceElevation, SurfaceGlow };
export { Surface };
