export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Brand & Accent */
        primary: {
          DEFAULT: '#FCD535',
          active: '#f0b90b',
          disabled: '#3a3a1f',
        },
        accent: {
          turquoise: '#2dbdb6',
        },
        /* Surface Dark Mode */
        canvas: {
          dark: '#0b0e11',
          light: '#ffffff',
        },
        surface: {
          'card-dark': '#1e2329',
          'elevated-dark': '#2b3139',
          'soft-light': '#fafafa',
          'strong-light': '#f5f5f5',
        },
        /* Hairlines & Borders */
        hairline: {
          'on-light': '#eaecef',
          'on-dark': '#2b3139',
        },
        border: {
          strong: '#cdd1d6',
        },
        /* Text */
        ink: '#181a20',
        body: {
          DEFAULT: '#eaecef',
          'on-light': '#181a20',
        },
        muted: {
          DEFAULT: '#707a8a',
          strong: '#929aa5',
        },
        'on-primary': '#181a20',
        'on-dark': '#ffffff',
        /* Trading Semantics */
        trading: {
          up: '#0ecb81',
          down: '#f6465d',
        },
        /* Info */
        info: {
          DEFAULT: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        plex: ['"JetBrains Mono"', '"IBM Plex Sans"', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        pill: '9999px',
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        section: '80px',
      },
      boxShadow: {
        'focus-ring': '0 0 0 2px rgba(59, 130, 246, 0.5)',
      },
    },
  },
  plugins: [],
}
