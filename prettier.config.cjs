// prettier.config.cjs
module.exports = {
  plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],

  // Wrapping style (adjust to taste)
  printWidth: 80,
  singleQuote: true,
  semi: false,
  htmlWhitespaceSensitivity: "ignore",

  // Let the plugin select the right parser; no manual parser override needed
  // If you want it explicit, you can add:
  // overrides: [{ files: '*.astro', options: { parser: 'astro' } }]
};
