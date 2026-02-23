/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}",
    "./js/**/*.js",
    "./css/**/*.css"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        primary: {
          DEFAULT: '#059669',
          hover: '#047857',
          light: '#10b981',
          dark: '#065f46',
          bg: '#ecfdf5'
        },
        accent: {
          DEFAULT: '#34d399',
          hover: '#10b981',
          light: '#6ee7b7'
        },
        background: {
          DEFAULT: '#f8fafc',
          card: '#ffffff',
          elevated: '#ffffff'
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#64748b',
          light: '#94a3b8'
        },
        border: {
          DEFAULT: '#e5e7eb',
          light: '#f1f5f9',
          dark: '#d1d5db'
        },
        success: {
          DEFAULT: '#059669',
          light: '#ecfdf5',
          dark: '#047857'
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fffbeb',
          dark: '#b45309'
        },
        error: {
          DEFAULT: '#dc2626',
          light: '#fef2f2',
          dark: '#b91c1c'
        },
        info: {
          DEFAULT: '#0284c7',
          light: '#f0f9ff',
          dark: '#0369a1'
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elevated': '0 10px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.15)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      }
    }
  },
  plugins: []
};
