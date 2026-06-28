import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import icon from 'astro-icon'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
  site: 'https://ayoubabed.xyz',

  integrations: [
    icon(),
    mdx(),
    react(),
    sitemap({
      filter: (page) =>
        page !== 'https://ayoubabed.xyz/portfolio/alphabravomedia/' &&
        !page.includes('/photo/'),
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
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
})
