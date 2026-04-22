export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Celestial Intelligence Surfaces ── */
        surface: {
          DEFAULT:  '#140727',
          dim:      '#140727',
          low:      '#190b30',
          mid:      '#201139',
          high:     '#271641',
          highest:  '#2e1c4b',
          bright:   '#352254',
          variant:  '#2e1c4b',
        },
        /* ── Primary Violet ── */
        primary: {
          DEFAULT: '#ba9eff',
          dim:     '#8455ef',
          cta:     '#8B5CF6',
          dark:    '#4C1D95',
        },
        /* ── Secondary Purple ── */
        secondary: {
          DEFAULT:   '#c285fb',
          container: '#622599',
        },
        /* ── Tertiary Cyan ── */
        tertiary: {
          DEFAULT: '#8ce7ff',
          dim:     '#40ceed',
        },
        /* ── On Colors ── */
        'on-bg':      '#eee0ff',
        'on-surface': '#eee0ff',
        'on-variant': '#b5a4cd',
        outline:      '#7e6f95',
        'outline-var':'#4f4165',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 55%, #4C1D95 100%)',
        'grad-title':   'linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)',
        'grad-surface': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(139,92,246,0.55), 0 0 45px rgba(139,92,246,0.25)',
        'glow-intense': '0 0 30px rgba(139,92,246,0.8), 0 0 60px rgba(139,92,246,0.4)',
        'glow-cyan':    '0 0 20px rgba(140,231,255,0.4)',
        'glass':        'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 60px -15px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':    'fade-in 0.45s ease both',
        'scale-in':   'scale-in 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'orb-pulse':  'orb-pulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'orb-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.6', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
}
