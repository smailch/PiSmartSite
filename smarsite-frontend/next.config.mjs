import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
    /** Évite la résolution depuis un package.json parent (ex. profil utilisateur) pour @import 'tailwindcss'. */
    resolveAlias: {
      tailwindcss: path.join(__dirname, "node_modules/tailwindcss"),
      "tw-animate-css": path.join(__dirname, "node_modules/tw-animate-css"),
    },
  },
};

export default nextConfig;
