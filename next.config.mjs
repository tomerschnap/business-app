import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // skip SW in dev to avoid noise
  buildExcludes: [/middleware-manifest\.json$/],
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withPWA(nextConfig)
