import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef5ee',
          100: '#fce9d7',
          200: '#f8d0ae',
          300: '#f2ae7a',
          400: '#eb8344',
          500: '#e76620',
          600: '#d94d16',
          700: '#b43915',
          800: '#8f2f18',
          900: '#742916',
          950: '#3f120a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'Segoe UI', 'Tahoma', 'Noto Sans Arabic', 'sans-serif'],
        arabic: ['Tajawal', 'Segoe UI', 'Tahoma', 'Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
