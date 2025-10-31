/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Azure App Service deployment
  output: 'standalone',
  
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
