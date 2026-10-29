/** @type {import('next').NextConfig} */
const APP = ["uebersicht", "openpoints", "aufgaben", "mein-tag", "kalender", "berichte", "notizen", "material", "planner", "service", "stammdaten"];

const nextConfig = {
  reactStrictMode: true,
  // addresses of earlier app versions lead into the construction-site app
  async redirects() {
    const old = ["/start", "/app", "/heute", "/dashboard/:path*", "/projekte/:path*", "/teamgrid/:path*", "/zeiten/:path*", "/kunden/:path*", "/abrechnung/:path*", "/einstellungen/:path*", "/druck/:path*", "/dateien/:path*", "/fuhrpark/:path*"];
    return [
      ...old.map((source) => ({ source, destination: "/uebersicht", permanent: false })),
      { source: "/offene-punkte", destination: "/openpoints", permanent: false },
      { source: "/planung/:path*", destination: "/planner", permanent: false },
      { source: "/team/:path*", destination: "/stammdaten", permanent: false },
      { source: "/mitarbeiter", destination: "/stammdaten", permanent: false },
      { source: "/maengel", destination: "/openpoints?ansicht=maengel", permanent: false }
    ];
  },
  // eGrid client links (/client/<id>/…) open the same modules
  async rewrites() {
    return APP.flatMap((m) => [
      { source: `/client/:clientId/${m}`, destination: `/${m}` },
      { source: `/client/:clientId/${m}/:path*`, destination: `/${m}/:path*` }
    ]);
  }
};

export default nextConfig;
