module.exports = {
  plugins: {
    // postcss-import MUST come first — it resolves @import statements
    // before tailwindcss processes the file. Without this, Next.js
    // webpack cannot follow @import paths that cross directory boundaries
    // (e.g. app/globals.css importing ../styles/tokens.css).
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
