/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Modern Co-Pilot Color Palette
      colors: {
        primary: '#6366F1',      // Deep Purple
        secondary: '#3B82F6',    // Electric Blue
        accent: '#10B981',       // Emerald
        warning: '#F97316',      // Coral
        surface: '#F8FAFC',      // Light Gray
        muted: '#64748B',        // Cool Gray
      },
      // Modern font stack
      fontFamily: {
        'primary': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      // Custom animations
      keyframes: {
        selectBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { 
            transform: 'scale(1.15)', 
            boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.3)' 
          },
          '100%': { 
            transform: 'scale(1.05)', 
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2)' 
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        popIn: {
          '0%': { transform: 'scale(0) translateY(50px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        }
      },
      animation: {
        'select-bounce': 'selectBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s infinite',
        'pop-in': 'popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      // Custom shadows for modern design
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'floating': '0 8px 25px rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}