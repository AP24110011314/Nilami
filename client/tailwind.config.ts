import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nilami: {
          green: {
            DEFAULT: '#5D866C',
            dark: '#3F5F4B',
            pressed: '#314B3B',
            light: '#CBD8D0',
            surface: '#EEF3EF',
          },
          tan: {
            DEFAULT: '#C2A68C',
            dark: '#8D6C4F',
            light: '#F2EAE1',
          },
          sand: {
            DEFAULT: '#E6D8C3',
            dark: '#CBB99F',
            surface: '#EDE3D4',
            light: '#F7F2EB',
          },
          ivory: {
            DEFAULT: '#F5F5F0',
            surface: '#FFFFFF',
          },
          border: {
            DEFAULT: '#E3DDD1',
            subtle: '#EDE8DF',
          },
          text: {
            DEFAULT: '#1F2A24',
            secondary: '#4A5B51',
            muted: '#6B7C72',
          },
          danger: {
            DEFAULT: '#B5523B',
            dark: '#8F3C28',
            surface: '#FBF0ED',
            border: '#F0D0C8',
          },
          warning: {
            DEFAULT: '#C47D2B',
            dark: '#8C5212',
            surface: '#FDF4EA',
            border: '#F5DEC2',
          },
          success: {
            DEFAULT: '#3F5F4B',
            surface: '#EEF3EF',
            border: '#CBD8D0',
          },
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
} satisfies Config;

