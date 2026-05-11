/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', './.storybook/**/*.{js,jsx,ts,tsx,mdx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
      fontFamily: {
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Aurora — surfaces (graphite scale)
        abyss: '#070809',
        base: '#0A0B0E',
        raised: '#101217',
        card: '#161922',
        'card-raised': '#1E222C',
        edge: '#272C38',
        scrim: '#3A4051',
        muted: '#5A6178',
        // Aurora — ink (warm paper)
        ink: {
          DEFAULT: '#F2EFE9',
          dim: 'rgba(242, 239, 233, 0.72)',
          faint: 'rgba(242, 239, 233, 0.48)',
          hush: 'rgba(242, 239, 233, 0.24)',
          ghost: 'rgba(242, 239, 233, 0.10)',
          whisper: 'rgba(242, 239, 233, 0.06)',
        },
        // Aurora — glow (semantic intent)
        aurora: {
          DEFAULT: '#7FE7B5',
          deep: '#3FBE85',
        },
        tide: {
          DEFAULT: '#7BB9FF',
          deep: '#4F8FE3',
        },
        plasma: {
          DEFAULT: '#A88BFF',
          deep: '#7A5EE3',
        },
        solar: {
          DEFAULT: '#FFB36B',
          deep: '#E08838',
        },
        ember: {
          DEFAULT: '#FF7B7B',
          deep: '#D94F4F',
        },
      },
      borderColor: {
        hairline: 'rgba(242, 239, 233, 0.06)',
        'hairline-strong': 'rgba(242, 239, 233, 0.12)',
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      spacing: {
        0.5: '2px',
        1.5: '6px',
        2.5: '10px',
        4.5: '18px',
      },
      letterSpacing: {
        eyebrow: '1.4px',
        tightest: '-1.5px',
        hero: '-3px',
      },
    },
  },
  plugins: [],
};
