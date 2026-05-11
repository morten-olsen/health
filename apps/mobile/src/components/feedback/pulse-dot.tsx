import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type PulseDotTone = Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice' | 'alert'>;

type PulseDotProps = {
  tone?: PulseDotTone;
  size?: number;
};

const TONE: Record<PulseDotTone, string> = {
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const PulseDot = ({ tone = 'recover', size = 8 }: PulseDotProps): ReactNode => {
  const color = TONE[tone];
  const halo = size * 2.5;
  return (
    <View
      style={{
        width: halo,
        height: halo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* The breath — slow, almost imperceptible ring (web-animated). */}
      <View
        style={[
          {
            position: 'absolute',
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: color,
            opacity: 0.18,
          },
          Platform.OS === 'web'
            ? ({
                animationName: 'aurora-pulse',
                animationDuration: '2.6s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
              } as unknown as ViewStyle)
            : null,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export type { PulseDotProps, PulseDotTone };
export { PulseDot };
