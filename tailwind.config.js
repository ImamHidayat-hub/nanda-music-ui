/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: '#1db954',
        dark: '#121212',
        darker: '#0a0a0a',
        light: '#b3b3b3'
      }
    },
  },
  plugins: [],
}