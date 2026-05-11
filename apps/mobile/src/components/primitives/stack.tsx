import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

type StackProps = {
  direction?: 'row' | 'column';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  padding?: number;
  style?: ViewStyle;
  className?: string;
  children: ReactNode;
};

const ALIGN: Record<NonNullable<StackProps['align']>, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY: Record<NonNullable<StackProps['justify']>, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

const Stack = ({
  direction = 'column',
  gap = 0,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  padding,
  style,
  className,
  children,
}: StackProps): ReactNode => {
  return (
    <View
      className={className}
      style={[
        {
          flexDirection: direction,
          gap,
          alignItems: ALIGN[align],
          justifyContent: JUSTIFY[justify],
          flexWrap: wrap ? 'wrap' : 'nowrap',
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export type { StackProps };
export { Stack };
