/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#022c22',
        },
        green: {
          islamic: '#1a6b36',
        },
        gold: {
          DEFAULT: '#c8a04a',
          light: '#d4b86a',
          dark: '#a07830',
        },
      },
      fontFamily: {
        arabic: ['Amiri', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
