/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Google Brand Colors
        google: {
          blue: '#4285F4',
          red: '#EA4335',
          yellow: '#FBBC05',
          green: '#34A853',
          grey: '#5F6368',
        },
        // Gemini Colors  
        gemini: {
          blue: '#1A73E8',
          purple: '#A142F4',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Google Sans Text', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
