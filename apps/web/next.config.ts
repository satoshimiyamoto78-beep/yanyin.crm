import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, images: { unoptimized: true } } : {}),
  // Static export (demo hosting) cannot use partial prerendering.
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  transpilePackages: ["@yanyin/domain", "@yanyin/seed"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
