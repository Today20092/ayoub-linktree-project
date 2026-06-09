import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://ayoubabed.xyz",
  integrations: [icon(), react()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare()
});