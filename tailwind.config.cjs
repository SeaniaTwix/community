/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      lineHeight: {
        'zero': '0',
      }
    },
  },
  plugins: [],
}
