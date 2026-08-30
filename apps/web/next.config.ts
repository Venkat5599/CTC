import type { NextConfig } from 'next';

const config: NextConfig = {
  // The workspace packages ship TypeScript source rather than a build step, so
  // Next compiles them in place. One less build to keep in sync.
  transpilePackages: ['@vouch/ui', '@vouch/sdk', '@vouch/config', '@vouch/schemas'],

  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },

  webpack(webpackConfig) {
    // wagmi's connector barrel reaches for the Coinbase and Base account SDKs,
    // which in turn import optional x402 payment packages that are not
    // installed and are not wanted: this application only ever uses the
    // injected connector, and it never asks a wallet to sign anything.
    //
    // Aliasing them to false is the honest fix. Installing them would pull a
    // payments stack into a site that reads public view functions, and letting
    // the resolution error stand would fail the build over a code path that is
    // never reached.
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@x402/evm': false,
      '@coinbase/cdp-sdk': false,
      '@base-org/account': false,
    };

    return webpackConfig;
  },
};

export default config;
