import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 active:bg-blue-600',
  secondary: 'bg-zinc-700 active:bg-zinc-600',
};

const Button = ({ label, onPress, variant = 'primary', disabled = false }: ButtonProps): ReactNode => {
  const variantClass = VARIANT_CLASSES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 ${variantClass} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="text-center text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
};

export type { ButtonProps, ButtonVariant };
export { Button };
