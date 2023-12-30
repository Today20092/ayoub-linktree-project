import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://Today20092.github.io",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    icon(),
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
