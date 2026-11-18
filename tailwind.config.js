/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Hover styles only where there is a real pointer, so they do not stick after a tap on a phone.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        space: '#070b16',
        ink: { DEFAULT: '#0e1526', 2: '#151e35', 3: '#1d2845' },
        line: 'rgba(190, 205, 235, 0.12)',
        fg: '#e8ecf5',
        dim: '#8d97b0',
        route: { DEFAULT: '#8fd3ff', deep: '#4aa3df' },
        city: { DEFAULT: '#ffb454', soft: '#ffd9a0' },
        hub: '#7a86a4',
        ground: '#a3dcc0',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      borderRadius: { panel: '18px' },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -12px rgba(0,0,0,0.65)',
        glow: '0 0 24px -4px rgba(143, 211, 255, 0.45)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        sink: {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateY(-6px)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        rise: 'rise 260ms cubic-bezier(.2,.8,.2,1) both',
        sink: 'sink 200ms ease-in both',
      },
    },
  },
  plugins: [],
}
