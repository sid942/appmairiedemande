const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  // ── Headers HTTP ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Autorise /embed à être chargé dans un <iframe> depuis n'importe quel domaine
        source: "/embed",
        headers: [
          { key: "X-Frame-Options",     value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
  // Désactivé : react-leaflet v4 n'est pas compatible avec le double-mount
  // de React Strict Mode (le conteneur Leaflet garde son _leaflet_id et le
  // 2e mount plante avec "Map container is already initialized").
  // En production ce mode n'est jamais actif, donc 0 impact.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
