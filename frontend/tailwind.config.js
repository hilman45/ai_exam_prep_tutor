/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': ['var(--font-poppins)', 'sans-serif'],
        'inter': ['var(--font-poppins)', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'sans-serif'],
        'sans': ['var(--font-poppins)', 'sans-serif'], // Set as default sans
      },
      colors: {
        primary: '#892CDC',
        secondary: '#F3F3F3',
        dark: '#191A23',
        accent: '#BC6FF1',
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
