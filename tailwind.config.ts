import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Palette officielle Ville de Fresnes ─────────────────────
        // Couleur principale : #046982 (teal profond).
        // Déclinaison complète pour usages UI (fonds, textes, borders…).
        fresnes: {
          50:  "#E6F2F6",
          100: "#C4E0E8",
          200: "#8FC4D3",
          300: "#52A4BA",
          400: "#1A86A0",
          500: "#046982", // ← couleur brand exacte
          600: "#03556B",
          700: "#024253",
          800: "#012E3A",
          900: "#011B22",
        },
        // Alias rétro-compat (les anciennes classes `mairie.*` continuent de marcher
        // mais pointent maintenant vers la palette Fresnes).
        mairie: {
          blue:  "#046982",
          light: "#E6F2F6",
          dark:  "#024253",
        },
      },
    },
  },
  plugins: [],
};
export default config;
