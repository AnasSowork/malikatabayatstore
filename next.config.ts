import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Hostinger runs server.js through Phusion Passenger. Docker still uses the
  // standalone artifact, enabled explicitly in the Docker builder stage.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ["three", "@react-three/fiber"],
  outputFileTracingIncludes: {
    "/*": [
      "./prisma/**/*",
      "./node_modules/prisma/**/*",
      "./node_modules/@prisma/**/*",
      "./node_modules/.prisma/**/*",
      "./messages/**/*",
    ],
  },
};

export default withNextIntl(nextConfig);
