/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'serif'],
      },
      colors: {
        bg: {
          base: '#0E0E0F',
          surface: '#161618',
          elevated: '#1E1E21',
          overlay: '#252529',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        },
        text: {
          primary: '#F0EFE9',
          secondary: '#9A9896',
          muted: '#5A5856',
        },
        accent: {
          DEFAULT: '#7B8FF5',
          soft: 'rgba(123,143,245,0.12)',
          border: 'rgba(123,143,245,0.3)',
        },
        amber: {
          note: '#F5A623',
          'note-bg': 'rgba(245,166,35,0.08)',
          'note-border': 'rgba(245,166,35,0.2)',
        },
        rss: {
          dot: '#E86A3A',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      }
    },
  },
  plugins: [],
}
