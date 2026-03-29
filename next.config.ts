import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "allinpokerai.com",
          },
        ],
        destination: "https://www.allinpokerai.com/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
