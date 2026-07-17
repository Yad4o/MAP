export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ─── Wise Brand ─────────────────────────────────────── */
        primary: {
          DEFAULT:  '#9fe870', // Wise lime-green CTA
          active:   '#cdffad', // hover/active
          neutral:  '#c5edab', // mid-saturation fill
          pale:     '#e2f6d5', // softest tint / badge bg
          disabled: '#c8e8b5',
        },

        /* ─── Surface ────────────────────────────────────────── */
        canvas: {
          DEFAULT: '#e8ebe6', // sage-tinted page background
          soft:    '#e8ebe6', // alias
          white:   '#ffffff', // card interior
          /* keep legacy dark alias so auth pages don't break */
          dark:    '#0b0e11',
          light:   '#ffffff',
        },

        /* ─── Text ───────────────────────────────────────────── */
        ink: {
          DEFAULT: '#0e0f0c',  // near-black, brand primary text
          deep:    '#163300',  // deep forest-green for positive surfaces
        },
        body: {
          DEFAULT:    '#454745',   // secondary body
          'on-light': '#0e0f0c',
        },
        mute: {
          DEFAULT: '#868685',
          strong:  '#6b6b6a',
        },
        /* Keep legacy on-dark alias */
        'on-dark':    '#ffffff',
        'on-primary': '#0e0f0c',

        /* ─── Semantic ───────────────────────────────────────── */
        positive: {
          DEFAULT: '#2ead4b',
          deep:    '#054d28',
          pale:    '#d1f5da',
        },
        warning: {
          DEFAULT: '#ffd11a',
          deep:    '#b86700',
          content: '#4a3b1c',
          pale:    '#fff5c2',
        },
        negative: {
          DEFAULT:  '#d03238',
          deep:     '#a72027',
          darkest:  '#a7000d',
          bg:       '#320707',
          pale:     '#fde8e9',
        },

        /* ─── Accent ─────────────────────────────────────────── */
        accent: {
          orange: '#ffc091',
          cyan:   '#38c8ff',
        },

        /* ─── Legacy surface tokens (used in auth pages) ─────── */
        surface: {
          'card-dark':     '#1e2329',
          'elevated-dark': '#2b3139',
          'soft-light':    '#fafafa',
          'strong-light':  '#f5f5f5',
        },
        hairline: {
          'on-light': '#eaecef',
          'on-dark':  '#2b3139',
        },
        border: {
          strong: '#cdd1d6',
          ink:    '#0e0f0c',
        },

        /* ─── Legacy trading tokens (used in existing charts) ─── */
        trading: {
          up:   '#0ecb81',
          down: '#f6465d',
        },
        info: {
          DEFAULT: '#3b82f6',
        },
        muted: {
          DEFAULT: '#868685',
          strong:  '#6b6b6a',
        },
      },

      fontFamily: {
        /* Display hero — Manrope weight 800/900 proxies Wise Sans */
        display: ['"Manrope"', 'Inter', 'sans-serif'],
        /* Body + utility */
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        /* Keep legacy alias */
        plex: ['"JetBrains Mono"', '"IBM Plex Sans"', 'monospace'],
      },

      borderRadius: {
        none: '0px',
        xs:   '2px',
        sm:   '8px',   // inline pills, small badges
        md:   '12px',  // form inputs, small chrome
        lg:   '16px',  // mid-size cards
        xl:   '24px',  // canonical button + card radius ← Wise signature
        '2xl':'32px',
        pill: '9999px',
        full: '9999px',
      },

      spacing: {
        xxs:     '2px',
        xs:      '4px',
        sm:      '8px',
        md:      '12px',
        lg:      '16px',
        xl:      '24px',
        '2xl':   '32px',
        '3xl':   '48px',
        section: '80px',
        /* legacy aliases */
        xxl:     '48px',
      },

      fontSize: {
        'display-mega': ['126px', { lineHeight: '107.1px', fontWeight: '900', letterSpacing: '0' }],
        'display-xxl':  ['96px',  { lineHeight: '81.6px',  fontWeight: '900', letterSpacing: '0' }],
        'display-xl':   ['64px',  { lineHeight: '54.4px',  fontWeight: '900', letterSpacing: '0' }],
        'display-lg':   ['47px',  { lineHeight: '70.5px',  fontWeight: '400', letterSpacing: '-0.108px' }],
        'display-md':   ['40px',  { lineHeight: '34px',    fontWeight: '900', letterSpacing: '0' }],
        'display-sm':   ['32px',  { lineHeight: '38.4px',  fontWeight: '600', letterSpacing: '-0.96px' }],
        'display-xs':   ['24px',  { lineHeight: '31.2px',  fontWeight: '600', letterSpacing: '-0.48px' }],
        'body-lg':      ['20px',  { lineHeight: '30px',    fontWeight: '400' }],
        'body-md':      ['16px',  { lineHeight: '24px',    fontWeight: '400' }],
        'body-sm':      ['14px',  { lineHeight: '20px',    fontWeight: '400' }],
        'caption':      ['12px',  { lineHeight: '16px',    fontWeight: '400' }],
      },

      boxShadow: {
        'focus-ring':   '0 0 0 3px rgba(159, 232, 112, 0.35)',
        'card':         '0 1px 3px rgba(14,15,12,0.06)',
        'card-hover':   '0 4px 12px rgba(14,15,12,0.10)',
        'modal':        '0 20px 60px rgba(14,15,12,0.18)',
      },
    },
  },
  plugins: [],
}
