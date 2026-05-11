import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { Text } from '../primitives/text.tsx';
import { theme } from '../../shared/theme/theme.ts';

type SegmentedOption<T extends string = string> = {
  id: T;
  label: string;
};

type SegmentedProps<T extends string = string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
};

const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>): ReactNode => {
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  const segmentWidth = 100 / options.length;
  return (
    <View
      style={{
        position: 'relative',
        flexDirection: 'row',
        backgroundColor: theme.tokens.surface.raised,
        borderRadius: 999,
        padding: 4,
        alignSelf: 'flex-start',
      }}
    >
      <View
        style={[
          {
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            width: `${segmentWidth}%`,
            backgroundColor: theme.tokens.surface.cardRaised,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.tokens.surface.hairlineStrong,
          },
          Platform.OS === 'web'
            ? ({
                transition: `transform ${theme.motion.duration.gentle}ms ${theme.motion.easing.glide}`,
                transform: `translateX(calc(${index} * 100%))`,
              } as unknown as ViewStyle)
            : null,
        ]}
      />
      {options.map((o) => {
        const isActive = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 18,
              minWidth: 80,
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            <Text
              role="caption"
              tone={isActive ? 'primary' : 'tertiary'}
              style={{ fontWeight: isActive ? '600' : '500' }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export type { SegmentedOption, SegmentedProps };
export { Segmented };
