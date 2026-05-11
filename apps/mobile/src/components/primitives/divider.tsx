import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';

type DividerProps = {
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
  emphasis?: 'whisper' | 'hairline' | 'edge';
  style?: ViewStyle;
};

const COLOR: Record<NonNullable<DividerProps['emphasis']>, string> = {
  whisper: 'rgba(242, 239, 233, 0.04)',
  hairline: theme.tokens.surface.hairline,
  edge: theme.tokens.surface.hairlineStrong,
};

const Divider = ({
  orientation = 'horizontal',
  inset = 0,
  emphasis = 'hairline',
  style,
}: DividerProps): ReactNode => {
  if (orientation === 'horizontal') {
    return (
      <View
        style={[
          {
            height: 1,
            marginHorizontal: inset,
            backgroundColor: COLOR[emphasis],
          },
          style,
        ]}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: 1,
          marginVertical: inset,
          backgroundColor: COLOR[emphasis],
        },
        style,
      ]}
    />
  );
};

export type { DividerProps };
export { Divider };
