/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Azure App Service deployment
  output: 'standalone',
  
  // Disable TypeScript errors during build to allow deployment
  // Type checking will still run but won't fail the build
  typescript: {
    ignoreBuildErrors: false, // Keep false to catch errors, but we'll handle them
  },
  
  // Enable CORS for mobile app communication
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // In production, specify your mobile app's domain
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
