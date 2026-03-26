import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tenant: {
          primary: 'var(--tenant-primary)',
          secondary: 'var(--tenant-secondary)',
          accent: 'var(--tenant-accent)',
          bg: 'var(--tenant-bg)',
        },
      },
    },
  },
  plugins: [],
}

export default config
