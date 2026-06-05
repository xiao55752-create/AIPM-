import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        accent: {
          DEFAULT: '#0D9488',
          hover: '#0F766E',
          muted: '#CCFBF1',
        },
        surface: '#FFFFFF',
        page: '#F8FAFC',
        video: '#FB7299',
      },
    },
  },
} satisfies Config
