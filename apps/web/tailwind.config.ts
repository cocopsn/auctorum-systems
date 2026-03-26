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
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sora: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-up': 'fade-up 0.8s ease-out forwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px var(--auctorum-glow), 0 0 60px transparent' },
          '50%': { boxShadow: '0 0 30px var(--auctorum-glow), 0 0 80px var(--auctorum-glow)' },
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
