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
        hostname: "coin-images.coingecko.com",
      },
    ],
  },
  experimental: {
    /**
     * Turbopack struggles with some test/bench files inside `thread-stream`
     * (pulled in via `pino`). Mark these heavy logging dependencies as
     * external for server components so Turbopack doesn't try to bundle
     * their internals (tests, README, zips, etc.).
     */
    serverComponentsExternalPackages: ["pino", "thread-stream"],
  },
};

export default nextConfig;
