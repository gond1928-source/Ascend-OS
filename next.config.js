/** @type {import("next").NextConfig} */
const nextConfig = {
  // Static export required for Tauri — Tauri loads the /out folder directly,
  // it does not run a Node.js server.
  output: "export",

  // Disable image optimization: Next.js image optimization requires a server,
  // which doesn't exist in a static export. Use standard <img> or a client-
  // side library inside Tauri instead.
  images: {
    unoptimized: true,
  },

  // Strict mode stays on — catches React lifecycle bugs early.
  reactStrictMode: true,

  // Asset prefix: empty in dev (served from localhost:3000).
  // In production Tauri loads files from the filesystem, so no prefix needed.
  // assetPrefix: process.env.NODE_ENV === "production" ? "./" : "",
};

module.exports = nextConfig;
