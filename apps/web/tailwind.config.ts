import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        auctorum: {
          bg: 'var(--auctorum-bg)',
          'surface-1': 'var(--auctorum-surface-1)',
          'surface-2': 'var(--auctorum-surface-2)',
          'surface-3': 'var(--auctorum-surface-3)',
          border: 'var(--auctorum-border)',
          body: 'var(--auctorum-body)',
          light: 'var(--auctorum-light)',
          white: 'var(--auctorum-white)',
          blue: 'var(--auctorum-blue)',
          'blue-bright': 'var(--auctorum-blue-bright)',
          glow: 'var(--auctorum-glow)',
          cyan: 'var(--auctorum-cyan)',
          purple: 'var(--auctorum-purple)',
          green: 'var(--auctorum-green)',
        },
        tenant: {
          primary: 'var(--tenant-primary)',
          secondary: 'var(--tenant-secondary)',
          bg: 'var(--tenant-bg)',
        },
      },
      fontFamily: {
        sora: ['Sora', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
