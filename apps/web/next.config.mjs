/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Exclude API routes from static generation
  experimental: {
    // Disable static generation for API routes
    workerThreads: false
  }
};

export default nextConfig;
