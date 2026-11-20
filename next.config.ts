import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  // IdP redirects to /api/editor-oidc/callback (no slash). A 308 to add "/" races PKCE cookies.
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ['127.0.0.1','localhost'],
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers(){
    return [{
      source: '/:path*',
      headers: [
        {key: 'X-Content-Type-Options', value: 'nosniff'},
        {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
        {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
      ],
    }];
  },
};
export default config;
