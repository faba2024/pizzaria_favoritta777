import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, async rewrites() { return { beforeFiles: [{ source: "/", destination: "/original/index.html" }] }; }, async headers() { return [{ source: '/(.*)', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}] }]; } };
export default config;
