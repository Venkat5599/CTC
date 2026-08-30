import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@vouch/ui', '@vouch/sdk', '@vouch/config', '@vouch/schemas'],
};

export default config;
