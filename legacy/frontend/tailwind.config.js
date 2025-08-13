// frontend/tailwind.config.js
// Add custom sizes for tile components

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom spacing for tile aspect ratios
      spacing: {
        '13': '3.25rem',   // 52px (tile width)
        '17': '4.25rem',   // 68px (close to tile height)
        '21': '5.25rem',   // 84px (scaled tile height)
      },
      // Custom aspect ratios for tiles
      aspectRatio: {
        'tile': '52 / 69',  // American Mahjong tile ratio
      }
    },
  },
  plugins: [],
}