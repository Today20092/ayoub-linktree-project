// prettier.config.js
module.exports = {
  plugins: ["prettier-plugin-tailwindcss"],

  // Customize parser options
  overrides: [
    {
      files: ["*.astro"], // Add any other file extensions you want to include
      options: {
        parser: "html", // Use the HTML parser for .astro files
      },
    },
  ],
};
