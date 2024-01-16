import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://ayoubabed.xyz",
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
