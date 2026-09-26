import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
  site: 'https://ayoubabed.xyz',
  trailingSlash: 'always',
  session: false,
  server: {
    allowedHosts: [
      'desktop-ayoub.cuttlefish-coho.ts.net',
      'payments.ayoubabed.xyz',
    ],
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: blob: https://i.ytimg.com https://i1.ytimg.com https://photos.ayoubabed.xyz",
        "font-src 'self' https://cdn.fontshare.com data:",
        'frame-src https://www.youtube-nocookie.com https://www.openstreetmap.org',
        "connect-src 'self' https://photos.ayoubabed.xyz https://cloudflareinsights.com",
        'upgrade-insecure-requests',
      ],
      scriptDirective: {
        resources: [
          "'self'",
          "'wasm-unsafe-eval'",
          'https://static.cloudflareinsights.com',
        ],
      },
      styleDirective: {
        resources: ["'self'", 'https://api.fontshare.com', "'unsafe-inline'"],
      },
    },
  },

  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, '')
        return (
          !pathname.startsWith('/admin/') &&
          pathname !== '/services' &&
          pathname !== '/payments' &&
          pathname !== '/portfolio/alphabravomedia' &&
          !pathname.includes('/photo/')
        )
      },
    }),
  ],

  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i1.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'photos.ayoubabed.xyz',
        pathname: '/events/**',
      },
      {
        protocol: 'https',
        hostname: 'keet.io',
        pathname: '/assets/favicons/**',
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare({
    imageService: {
      build: 'cloudflare-binding',
      runtime: 'cloudflare-binding',
    },
  }),
})
