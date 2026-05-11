import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '../primitives/icon.tsx';
import { Text } from '../primitives/text.tsx';
import type { IconName } from '../primitives/icon.tsx';
import { theme } from '../../shared/theme/theme.ts';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
};

const EmptyState = ({ icon = 'leaf', title, body, action }: EmptyStateProps): ReactNode => {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 16,
        padding: 32,
        maxWidth: 420,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.tokens.surface.card,
          borderWidth: 1,
          borderColor: theme.tokens.surface.hairlineStrong,
        }}
      >
        <Icon name={icon} size={28} tone="tertiary" />
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text role="title" align="center">
          {title}
        </Text>
        {body ? (
          <Text role="body" tone="secondary" align="center">
            {body}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
};

export type { EmptyStateProps };
export { EmptyState };
