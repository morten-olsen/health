import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type TagTone = Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice' | 'alert'> | 'neutral';

type TagProps = {
  label: string;
  tone?: TagTone;
};

const TONE_COLOR: Record<TagTone, string> = {
  neutral: theme.tokens.ink.secondary,
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

const TONE_BG: Record<TagTone, string> = {
  neutral: 'rgba(242, 239, 233, 0.04)',
  rest: 'rgba(123, 185, 255, 0.10)',
  recover: 'rgba(127, 231, 181, 0.10)',
  strain: 'rgba(168, 139, 255, 0.10)',
  notice: 'rgba(255, 179, 107, 0.10)',
  alert: 'rgba(255, 123, 123, 0.10)',
};

const Tag = ({ label, tone = 'neutral' }: TagProps): ReactNode => {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: TONE_BG[tone],
      }}
    >
      <Text role="micro" uppercase style={{ color: TONE_COLOR[tone], fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
};

export type { TagProps, TagTone };
export { Tag };
