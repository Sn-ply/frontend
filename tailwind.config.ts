import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: colors.zinc[200],
        background: colors.white,
        foreground: colors.zinc[950],
        primary: {
          DEFAULT: colors.sky[500],
          foreground: colors.white,
        },
        accent: {
          DEFAULT: colors.rose[500],
          foreground: colors.white,
        },
        muted: {
          DEFAULT: colors.zinc[100],
          foreground: colors.zinc[500],
        },
        ring: colors.sky[500],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.625rem',
        sm: '0.5rem',
      },
    },
  },
  plugins: [],
}

export default config
