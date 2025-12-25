/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.BUILD_MODE === 'mobile';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: isMobileBuild ? 'export' : undefined,
    experimental: {
        instrumentationHook: true
    },
    images: {
        unoptimized: isMobileBuild,
    },
    async headers() {
        return [
            {
                // matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // In production, replace * with your app's origin
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
                ]
            }
        ]
    }
}

module.exports = nextConfig
