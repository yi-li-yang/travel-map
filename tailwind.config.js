import visualPreference from './src/vp/tailwind-v3.cjs'

// Colours, type, space, corners and motion come from Yili's visual system (src/vp, see DESIGN.md).
// This file only names what each data colour means here, so components say `bg-flight`, not `bg-data-sky`.

/** @type {import('tailwindcss').Config} */
export default {
  presets: [visualPreference],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Hover styles only where there is a real pointer, so they do not stick after a tap on a phone.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        flight: 'var(--data-sky)',
        overland: 'var(--data-spruce)',
        place: 'var(--data-ochre)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        sink: {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateY(-4px)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        rise: 'rise var(--panel) var(--out) both',
        sink: 'sink var(--panel) var(--out) both',
      },
    },
  },
  plugins: [],
}
