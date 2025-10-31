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
        servair: {
          blue: '#007AFF',
          dark: '#1a1a1a',
          gray: '#6b7280',
          light: '#f8fafc',
        }
      },
    },
  },
  plugins: [],
}
