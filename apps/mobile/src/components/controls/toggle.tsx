import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type ToggleTone = Extract<Intent, 'recover' | 'rest' | 'strain' | 'notice' | 'alert'> | 'neutral';

type ToggleProps = {
  value: boolean;
  onChange?: (next: boolean) => void;
  tone?: ToggleTone;
  disabled?: boolean;
};

const TONE_COLOR: Record<ToggleTone, string> = {
  neutral: theme.tokens.ink.primary,
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const WIDTH = 48;
const HEIGHT = 28;
const THUMB = 22;
const INSET = (HEIGHT - THUMB) / 2;

const Toggle = ({ value, onChange, tone = 'recover', disabled = false }: ToggleProps): ReactNode => {
  const handlePress = (): void => {
    if (disabled) return;
    onChange?.(!value);
  };
  const trackColor = value ? TONE_COLOR[tone] : theme.tokens.surface.edge;
  const thumbColor = value ? theme.tokens.surface.abyss : theme.tokens.ink.primary;
  return (
    <Pressable onPress={handlePress} disabled={disabled} accessibilityRole="switch">
      <View
        style={[
          {
            width: WIDTH,
            height: HEIGHT,
            borderRadius: HEIGHT / 2,
            backgroundColor: trackColor,
            padding: INSET,
            opacity: disabled ? 0.4 : 1,
          },
          Platform.OS === 'web'
            ? ({
                transition: `background-color ${theme.motion.duration.gentle}ms ${theme.motion.easing.glide}`,
              } as unknown as ViewStyle)
            : null,
        ]}
      >
        <View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: thumbColor,
            },
            Platform.OS === 'web'
              ? ({
                  transition: `transform ${theme.motion.duration.gentle}ms ${theme.motion.easing.spring}`,
                  transform: value ? `translateX(${WIDTH - THUMB - INSET * 2}px)` : 'translateX(0)',
                } as unknown as ViewStyle)
              : { transform: [{ translateX: value ? WIDTH - THUMB - INSET * 2 : 0 }] },
          ]}
        />
      </View>
    </Pressable>
  );
};

export type { ToggleProps, ToggleTone };
export { Toggle };
