import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
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
