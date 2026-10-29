/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // the app is being rebuilt: its addresses lead to the website for now
  async redirects() {
    return ["/demo", "/start", "/dashboard", "/projekte/:path*", "/planung/:path*", "/team/:path*", "/zeiten/:path*", "/kunden/:path*", "/abrechnung/:path*", "/einstellungen/:path*", "/druck/:path*", "/app", "/teamgrid", "/heute"].map((source) => ({ source, destination: "/", permanent: false }));
  }
};

export default nextConfig;
