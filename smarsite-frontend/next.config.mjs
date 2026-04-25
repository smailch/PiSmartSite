import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Cible du proxy dev : NestJS (défaut port 3200). Surcharge : BACKEND_PROXY_TARGET */
const backendProxyTarget =
  (process.env.BACKEND_PROXY_TARGET || "http://127.0.0.1:3200").replace(
    /\/$/,
    "",
  );

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
    ],
  },
  /** Same-origin en dev : le navigateur appelle /api-backend/*, Next transfère vers Nest (évite CORS / « Failed to fetch »). */
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${backendProxyTarget}/:path*`,
      },
    ];
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
