/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // This prevents static generation errors when Supabase env vars aren't available during build
    dynamicIO: true,
  },
  output: 'standalone',
}

export default nextConfig
