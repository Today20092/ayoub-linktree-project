/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      animation: {
        blob: "blob 10s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "scale(1) translate(0rem, 0rem)",
          },
          "25%": {
            transform: "scale(1.35) translate(2rem, 2rem)",
          },
          "50%": {
            transform: "scale(1) translate(1rem, -1rem)",
          },
          "75%": {
            transform: "scale(0.8) translate(-1rem, 0rem)",
          },
          "100%": {
            transform: "scale(1) translate(0rem, 0rem)",
          },
        },
      },
    },
  },
  plugins: [],
};
