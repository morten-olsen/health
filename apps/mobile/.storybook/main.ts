import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-native-web-vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
      },
    },
  },
  viteFinal: async (viteConfig) => {
    return {
      ...viteConfig,
      // Relative base so the static build works at any mount path
      // (e.g. https://health.mortenolsen.pro/design-system/).
      base: './',
      resolve: {
        ...viteConfig.resolve,
        alias: {
          ...(viteConfig.resolve?.alias ?? {}),
          'expo-haptics': path.resolve(dirname, 'mocks/expo-haptics.ts'),
        },
      },
    };
  },
};

export default config;
