/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        text: '#130000',
        background: '#f8f2f2',
        primary: '#820000',
        secondary: '#4e6c50',
        accent: '#f2deba',
      },
    },
  },
  plugins: [],
}