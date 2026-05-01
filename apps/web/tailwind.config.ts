import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/dashboard.tsx',
  ],
  theme: {
    extend: {
      colors: {
        // AUCTORUM Design System — steel-blue accent (institutional dark).
        // Override Tailwind's `blue` so existing utility classes (text-blue-400,
        // bg-blue-600, etc.) across landing + about page match the design
        // system palette without per-file rewrites.
        blue: {
          50:  '#e9f0f6',
          100: '#cfdbe6',
          200: '#a8b9cc',
          300: '#7c93ad',
          400: '#7099b8',
          500: '#4a7c9b',
          600: '#2f5e7e',
          700: '#1d4569',
          800: '#143654',
          900: '#0f2a44',
          950: '#081a2d',
        },
        // Map violet-* (used in the about-page hero gradient) to a deeper
        // steel tone so accent gradients read institutional, not playful.
        violet: {
          400: '#9db7db',
          500: '#7099b8',
          600: '#4a7c9b',
        },
        primary: {
          DEFAULT: '#2f5e7e',
          50:  '#e9f0f6',
          100: '#cfdbe6',
          200: '#a8b9cc',
          300: '#7c93ad',
          400: '#7099b8',
          500: '#4a7c9b',
          600: '#2f5e7e',
          700: '#1d4569',
          800: '#143654',
          900: '#0f2a44',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        tenant: {
          primary: 'var(--tenant-primary)',
          secondary: 'var(--tenant-secondary)',
          bg: 'var(--tenant-bg)',
        },
      },
      fontFamily: {
        sora: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.5s ease-out both',
        'slide-in': 'slideIn 0.4s ease-out both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
    },
  },
  plugins: [],
};

export default config;
