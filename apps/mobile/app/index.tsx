import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

const Index = (): ReactNode => {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-white">Health</Text>
    </View>
  );
};

export default Index;
