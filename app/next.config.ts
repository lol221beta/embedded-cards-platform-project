import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Allow any external image domain for OG images and favicons
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
  },
}

export default nextConfig
