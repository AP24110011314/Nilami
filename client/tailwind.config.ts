import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nilami: {
          green: {
            DEFAULT: '#BDB395',
            dark: '#4E4635',
            pressed: '#3A3326',
            light: '#D5C7A3',
            surface: '#F2E2B1',
            subtle: '#F2E2B1',
          },
          tan: {
            DEFAULT: '#F2E2B1',
            dark: '#5E5138',
            light: '#FAF3DC',
          },
          sand: {
            DEFAULT: '#D5C7A3',
            dark: '#BDB395',
            surface: '#EFE7D4',
            light: '#F5EFE1',
          },
          ivory: {
            DEFAULT: '#F6F0F0',
            surface: '#FCF9F9',
          },
          border: {
            DEFAULT: '#D5C7A3',
            subtle: '#E6DEC9',
            strong: '#BDB395',
          },
          text: {
            DEFAULT: '#2A241A',
            secondary: '#59503C',
            muted: '#6E644E',
          },
          danger: {
            DEFAULT: '#B5523B',
            dark: '#8F3C28',
            surface: '#F9EBE8',
            subtle: '#F9EBE8',
            border: '#EBC8C0',
          },
          warning: {
            DEFAULT: '#A87228',
            dark: '#7D490E',
            surface: '#F2E2B1',
            border: '#BDB395',
          },
          success: {
            DEFAULT: '#4E4635',
            surface: '#F2E2B1',
            border: '#D5C7A3',
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

