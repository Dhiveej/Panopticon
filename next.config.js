/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile force-graph packages for Next.js compatibility
  transpilePackages: ['react-force-graph-2d', 'react-force-graph-3d', 'force-graph', '3d-force-graph', 'three'],
};

module.exports = nextConfig;
