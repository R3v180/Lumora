import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    'localhost',
    '192.168.1.129',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.local'
  ],
};

export default withNextIntl(nextConfig);
