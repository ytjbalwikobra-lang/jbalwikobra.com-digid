/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyber-Compact Design System
        cyber: {
          pure: '#000000',
          surface: '#0a0a0a',
          elevated: '#121212',
          card: '#1a1a1a',
          pink: {
            glow: '#ff2d92',
            DEFAULT: '#ec4899',
            secondary: '#f472b6',
            muted: 'rgba(236, 72, 153, 0.3)',
            subtle: 'rgba(236, 72, 153, 0.15)',
            ghost: 'rgba(236, 72, 153, 0.08)',
          },
          cyan: '#06b6d4',
          purple: '#a855f7',
          green: '#10b981',
          orange: '#f97316',
          red: '#ef4444',
          text: {
            DEFAULT: '#ffffff',
            secondary: '#a1a1aa',
            muted: '#71717a',
            disabled: '#52525b',
          },
          border: {
            DEFAULT: 'rgba(255, 255, 255, 0.08)',
            hover: 'rgba(255, 255, 255, 0.15)',
            active: 'rgba(236, 72, 153, 0.5)',
          },
        },
        ds: {
          pink: 'var(--primary-pink)',
          'pink-light': 'var(--primary-pink-light)',
            'pink-dark': 'var(--primary-pink-dark)',
          'pink-secondary': 'var(--secondary-pink)',
          'pink-accent': 'var(--accent-pink)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          bg: 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary': 'var(--bg-tertiary)'
        },
        app: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          surface2: 'var(--surface-2)',
          border: 'var(--border)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          accent: 'var(--accent)',
          accent600: 'var(--accent-600)',
          dark: '#000000'
        },
        // iOS Design System Colors
        ios: {
          background: 'var(--ios-background)',
          surface: 'var(--ios-surface)',
          'surface-secondary': 'var(--ios-surface-secondary)',
          text: 'var(--ios-text)',
          'text-secondary': 'var(--ios-text-secondary)',
          border: 'var(--ios-border)',
          accent: 'var(--ios-accent)',
          primary: 'var(--ios-primary)',
          secondary: 'var(--ios-secondary)',
          destructive: 'var(--ios-destructive)',
          success: 'var(--ios-success)',
          warning: 'var(--ios-warning)'
        },
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Cyber-Compact: High density typography
        '2xs': ['0.625rem', { lineHeight: '1.4' }],    // 10px - badges, labels
        'xs': ['0.75rem', { lineHeight: '1.4' }],      // 12px - captions, meta
        'sm': ['0.8125rem', { lineHeight: '1.4' }],    // 13px - body small  
        'base': ['0.875rem', { lineHeight: '1.5' }],   // 14px - body default
        'md': ['0.9375rem', { lineHeight: '1.5' }],    // 15px - body emphasis
        'lg': ['1rem', { lineHeight: '1.5' }],         // 16px - subheadings
        'xl': ['1.125rem', { lineHeight: '1.5' }],     // 18px - headings
        '2xl': ['1.25rem', { lineHeight: '1.4' }],     // 20px - titles
        '3xl': ['1.5rem', { lineHeight: '1.3' }],      // 24px - hero text
        '4xl': ['1.75rem', { lineHeight: '1.2' }],     // 28px base
        '5xl': ['2rem', { lineHeight: '1.1' }],        // 32px base
        '6xl': ['2.25rem', { lineHeight: '1.1' }],     // 36px base
      },
      spacing: {
        // Cyber-Compact: Tight spacing for high density
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '3': '0.75rem',     // 12px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
      },
      borderRadius: {
        'sm': '0.375rem',   // 6px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.25rem',   // 20px
      },
      boxShadow: {
        'cyber-sm': '0 0 8px rgba(236, 72, 153, 0.3)',
        'cyber-md': '0 0 16px rgba(236, 72, 153, 0.4)',
        'cyber-lg': '0 0 32px rgba(236, 72, 153, 0.5)',
        'cyber-card': '0 4px 24px rgba(0, 0, 0, 0.6)',
      },
      transitionTimingFunction: {
        'cyber': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'cyber-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}