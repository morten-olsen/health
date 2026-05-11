import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

/**
 * Aurora icons are monoline, 24×24, single-path. They are drawn at 1.5 stroke
 * with round caps and joins, no fills. Everything else is forbidden — the
 * set's coherence is its character.
 *
 * We carry our own paths rather than depending on a generic icon library
 * because the icon set is part of the design system, not a commodity.
 */

type IconName =
  | 'heart'
  | 'pulse'
  | 'moon'
  | 'sun'
  | 'steps'
  | 'flame'
  | 'drop'
  | 'lung'
  | 'ring'
  | 'path'
  | 'mountain'
  | 'spark'
  | 'leaf'
  | 'chevron-right'
  | 'chevron-down'
  | 'plus'
  | 'check'
  | 'arrow-up-right'
  | 'arrow-down-right';

type IconTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'rest'
  | 'recover'
  | 'strain'
  | 'notice'
  | 'alert';

type IconProps = {
  name: IconName;
  size?: number;
  tone?: IconTone;
  style?: ViewStyle;
};

const TONE: Record<IconTone, string> = {
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

/**
 * Paths are described as `d=` strings on a 24×24 canvas. All strokes,
 * never fills. The aesthetic: gently rounded, generous negative space,
 * just slightly looser than San Francisco — closer in spirit to Things'
 * iconography than Apple's HIG.
 */
const PATHS: Record<IconName, string> = {
  heart:
    'M12 19.5C9 17 4 13.5 4 9.5C4 7 6 5 8.5 5C10 5 11 5.5 12 7C13 5.5 14 5 15.5 5C18 5 20 7 20 9.5C20 13.5 15 17 12 19.5Z',
  pulse:
    'M3 12H7L9 7L13 17L15 12H21',
  moon:
    'M20 14.5C19.2 17.7 16.4 20 13 20C9 20 5.5 16.5 5.5 12.5C5.5 9 8 6 11.5 5.5C10.5 7 10 8.5 10 10C10 13.6 13 16.5 16.5 16.5C18 16.5 19.2 16 20 14.5Z',
  sun:
    'M12 7V4 M12 20V17 M17 12H20 M4 12H7 M16.5 7.5L18.5 5.5 M5.5 18.5L7.5 16.5 M16.5 16.5L18.5 18.5 M5.5 5.5L7.5 7.5 M15.5 12C15.5 13.9 13.9 15.5 12 15.5C10.1 15.5 8.5 13.9 8.5 12C8.5 10.1 10.1 8.5 12 8.5C13.9 8.5 15.5 10.1 15.5 12Z',
  steps:
    'M7 17C7 14 9 12 9 9C9 6.8 7.8 5 6 5C4.5 5 3.5 6 3.5 7.5C3.5 9.5 5 11 5 13C5 14.5 4 16 4 17.5 M16 19C16 16.5 18 14.5 18 11.5C18 9.3 16.8 7.5 15 7.5C13.5 7.5 12.5 8.5 12.5 10C12.5 12 14 13.5 14 15.5C14 17 13 18.5 13 20',
  flame:
    'M12 21C8 21 5.5 18 5.5 14.5C5.5 11 8.5 9 9 6C9 4.5 10 3 12 3C12 6 14.5 7 14.5 10C14.5 11.5 13.5 12.5 12.5 12.5C13 11.5 13 10.5 12.5 9.5C13.5 12 16 13 16 15.5C16 18.5 14 21 12 21Z',
  drop:
    'M12 4C8 9 6 12.5 6 15.5C6 18.5 8.5 21 12 21C15.5 21 18 18.5 18 15.5C18 12.5 16 9 12 4Z',
  lung:
    'M12 4V14 M12 14C12 17 10 19 8 19C6 19 5 18 5 16C5 13 6.5 10 8 8 M12 14C12 17 14 19 16 19C18 19 19 18 19 16C19 13 17.5 10 16 8',
  ring:
    'M12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12 20C7.6 20 4 16.4 4 12C4 7.6 7.6 4 12 4Z M12 7.5C14.5 7.5 16.5 9.5 16.5 12',
  path:
    'M4 18C4 15 6 13 9 13C12 13 12 15 15 15C18 15 20 13 20 10C20 7 18 5 15 5',
  mountain:
    'M3 19L9 9L13 15L15 12L21 19Z',
  spark:
    'M12 4V8 M12 16V20 M4 12H8 M16 12H20 M6.3 6.3L8.5 8.5 M15.5 15.5L17.7 17.7 M6.3 17.7L8.5 15.5 M15.5 8.5L17.7 6.3',
  leaf:
    'M5 19C5 13 9 8 16 6C18 6 19 7 19 9C19 16 14 19 9 19C7 19 6 19 5 19Z M5 19C7 15 10 12 14 10',
  'chevron-right':
    'M9 6L15 12L9 18',
  'chevron-down':
    'M6 9L12 15L18 9',
  plus: 'M12 5V19 M5 12H19',
  check: 'M5 12L10 17L19 7',
  'arrow-up-right': 'M7 17L17 7 M9 7H17V15',
  'arrow-down-right': 'M7 7L17 17 M17 9V17H9',
};

const Icon = ({
  name,
  size = 24,
  tone = 'primary',
  style,
}: IconProps): ReactNode => {
  const color = TONE[tone];
  if (Platform.OS === 'web') {
    // Inline SVG renders natively in the DOM via react-native-web pass-through.
    const SvgEl = 'svg' as unknown as React.ElementType;
    const PathEl = 'path' as unknown as React.ElementType;
    return (
      <View
        style={[
          { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <SvgEl
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <PathEl d={PATHS[name]} />
        </SvgEl>
      </View>
    );
  }
  // Native fallback — render a labeled placeholder until react-native-svg lands.
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: color,
        },
        style,
      ]}
    />
  );
};

const ICON_NAMES = Object.keys(PATHS) as IconName[];

export type { IconName, IconProps, IconTone };
export { Icon, ICON_NAMES };
