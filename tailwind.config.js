/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'notion-blue': '#0075de',
        'notion-blue-active': '#005bab',
        'warm-white': '#f6f5f4',
        'warm-dark': '#31302e',
        'warm-gray-500': '#615d59',
        'warm-gray-300': '#a39e98',
        'badge-blue-bg': '#f2f9ff',
        'badge-blue-text': '#097fe8',
      },
    },
  },
  plugins: [],
}
