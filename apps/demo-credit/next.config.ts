import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@vouch/ui', '@vouch/sdk', '@vouch/config', '@vouch/schemas'],

  webpack(webpackConfig) {
    // See apps/web: wagmi's connector barrel pulls optional payment SDKs this
    // application never touches.
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
