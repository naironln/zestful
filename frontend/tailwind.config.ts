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
        sage: {
          50: '#f6f7f5',
          100: '#e8ebe5',
          200: '#d4d9cd',
          300: '#b3bca8',
          400: '#8d9a7e',
          500: '#6b7a5c',
          600: '#546345',
          700: '#424e36',
          800: '#363f2e',
          900: '#2e3528',
          950: '#181d14',
        },
        'warm-gray': {
          50: '#fafaf8',
          100: '#f5f4f1',
          200: '#e8e6e1',
          300: '#d5d2cb',
          400: '#b0aba1',
          500: '#908a7e',
          600: '#756f64',
          700: '#605b52',
          800: '#514d46',
          900: '#46423d',
          950: '#292723',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgb(240 168 50 / 0.4)' },
          '50%': { borderColor: 'rgb(240 168 50 / 1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-out-left': 'slide-out-left 0.3s ease-out',
        'overlay-in': 'overlay-in 0.2s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'pulse-border': 'pulse-border 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
