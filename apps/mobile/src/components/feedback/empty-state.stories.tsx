import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { EmptyState } from './empty-state.tsx';
import { Button } from '../controls/button.tsx';

const meta: Meta<typeof EmptyState> = {
  title: 'Aurora/Feedback/EmptyState',
  component: EmptyState,
};

type Story = StoryObj<typeof EmptyState>;

const Example: Story = {
  render: () => (
    <View style={{ alignItems: 'center' }}>
      <EmptyState
        icon="leaf"
        title="Nothing yet — and that's fine"
        body="Aurora is listening. As soon as a device sends a reading, this page begins to fill in. No need to do anything special."
        action={<Button label="Connect a device" variant="soft" icon="plus" />}
      />
    </View>
  ),
};

export default meta;
export { Example };
