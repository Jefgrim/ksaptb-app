import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "affable-ox-332.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
