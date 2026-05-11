import { Link, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

const NotFound = (): ReactNode => {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">This screen doesn't exist.</Text>
        <Link href="/" className="mt-4 text-blue-400">
          Go home
        </Link>
      </View>
    </>
  );
};

export default NotFound;
