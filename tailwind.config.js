/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        serafina: {
          dark: '#09090b',
          accent: '#ec4899',
        }
      },
    },
  },
  plugins: [],
};
