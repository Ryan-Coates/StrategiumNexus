/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#05050a',
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a24',
          600: '#252530',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c97a',
          dark: '#8a6820',
          muted: '#6b5530',
        },
        blood: {
          DEFAULT: '#8b1a1a',
          light: '#b22222',
          dark: '#5a0f0f',
        },
        parchment: {
          DEFAULT: '#e8e0d0',
          muted: '#a09880',
          faint: '#6b6255',
        },
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'serif'],
        heading: ['"Cinzel"', 'serif'],
        body: ['"Crimson Pro"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #8a6820 0%, #c9a84c 50%, #8a6820 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 50%, transparent 100%)',
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(201, 168, 76, 0.12)',
        'blood-glow': '0 0 24px rgba(139, 26, 26, 0.2)',
        'inner-dark': 'inset 0 2px 10px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
