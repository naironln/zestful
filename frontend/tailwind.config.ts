import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9ee',
          100: '#fdf0d5',
          200: '#f9dea3',
          300: '#f5c667',
          400: '#f0a832',
          500: '#ec8d13',
          600: '#dd700a',
          700: '#b7530b',
          800: '#924110',
          900: '#773710',
          950: '#401b06',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
}

export default config
