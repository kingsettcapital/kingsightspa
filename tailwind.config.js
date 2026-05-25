/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'Arial', 'sans-serif'],
      },
      colors: {
        /* KingSett Capital — digital palette (Brand Guidelines v1.4) */
        kingsett: {
          blue: '#00529B',
          'blue-dark': '#003666',
          navy: '#0C274A',
          gold: '#E7A614',
          'pale-blue': '#E6EDF7',
          'light-blue': '#ACC4E3',
          'pale-grey': '#F2F2F2',
          grey: '#E5E5E5',
          black: '#000000',
          white: '#FFFFFF',
        },
        /* Map Tailwind blue utilities to brand digital blue */
        blue: {
          50: '#E6EDF7',
          100: '#ACC4E3',
          200: '#ACC4E3',
          300: '#456896',
          400: '#456896',
          500: '#00529B',
          600: '#00529B',
          700: '#003666',
          800: '#0C274A',
          900: '#0C274A',
        },
      },
    },
  },
  plugins: [],
};
