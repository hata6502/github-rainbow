/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["docs/index.html", "docs/index.js"],
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
