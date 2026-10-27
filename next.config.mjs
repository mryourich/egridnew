/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // a new id per build: the offline worker swaps all cached files on every update
  env: { NEXT_PUBLIC_BUILD_ID: String(Date.now()) },
  // addresses of the earlier app keep working
  async redirects() {
    return ["/dashboard", "/planung", "/team", "/app", "/teamgrid"].map((source) => ({ source, destination: "/projekte", permanent: false }));
  }
};

export default nextConfig;
