/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
      },
      colors: {
        kingsett: {
          blue: '#0C274A',
          black: '#000000',
        },
      },
    },
  },
  plugins: [],
};
