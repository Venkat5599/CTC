import type { NextConfig } from "next";

/**
 * Optional wallet-SDK dependencies that are never executed.
 *
 * Coinbase Wallet SDK (pulled in by RainbowKit) lazily imports the `@x402/*`
 * payment packages. They are optional at runtime but Turbopack resolves the
 * graph statically, so a missing one fails the build inside a branch that
 * cannot run. Point them at a stub that throws if it is ever really reached.
 */
const X402_OPTIONAL = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm",
  "@x402/svm/exact/client",
];

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: Object.fromEntries(
      X402_OPTIONAL.map((mod) => [mod, "./lib/stubs/empty.ts"]),
    ),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
