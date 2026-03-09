/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matching CSS custom properties from the web app
        accent: '#f90',       // --accent (orange, Track A)
        'accent-secondary': '#ff0', // --accent-secondary (yellow, Track B)
        bg: {
          primary: '#0f0f0f',   // --bg-primary
          secondary: '#1a1a1a', // --bg-secondary
          tertiary: '#2a2a2a',  // --bg-tertiary
        },
        text: {
          primary: '#e0e0e0',   // --text-primary
          secondary: '#888',    // --text-secondary
          muted: '#555',        // --text-muted
        },
        // Beat/grid specific
        'beat-a': '#f90',
        'beat-b': '#ff0',
        'beat-both': '#ffffff',
        'beat-empty': '#1a1a1a',
        'pulse-glow': '#add8e6', // light-blue pulse sweep
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
