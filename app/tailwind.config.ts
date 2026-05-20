import type { Config } from 'tailwindcss'

// Tailwind v4 — theme is defined in globals.css via @theme
// This file kept for tooling compatibility
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
