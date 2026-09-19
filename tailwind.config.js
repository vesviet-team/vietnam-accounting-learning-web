/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accounting: {
          asset: '#059669', // Emerald 600
          liability: '#dc2626', // Red 600
          equity: '#7c3aed', // Violet 600
          revenue: '#2563eb', // Blue 600
          expense: '#d97706', // Amber 600
          other: '#4b5563', // Gray 600
          result: '#0891b2', // Cyan 600
        },
      },
    },
  },
  plugins: [],
}
