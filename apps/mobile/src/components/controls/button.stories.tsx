import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from './button.tsx';

const meta: Meta<typeof Button> = {
  title: 'controls/Button',
  component: Button,
  args: {
    label: 'Press me',
    variant: 'primary',
    disabled: false,
    onPress: () => {},
  },
};

type Story = StoryObj<typeof Button>;

const Primary: Story = {};

const Secondary: Story = {
  args: { variant: 'secondary' },
};

const Disabled: Story = {
  args: { disabled: true },
};

export default meta;
export { Primary, Secondary, Disabled };
