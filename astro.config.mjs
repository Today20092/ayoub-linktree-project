import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  styles: {
    postcss: {
      plugins: [
        // ... other PostCSS plugins
        // require("prettier-plugin-tailwindcss"),
      ],
    },
  },
});
