import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/stoa-directory",
  images: { unoptimized: true },
};

export default nextConfig;
