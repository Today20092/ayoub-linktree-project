import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import icon from 'astro-icon'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  site: 'https://ayoubabed.xyz',
  integrations: [icon(), mdx(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
})
