import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vysner.com"),
  title: { default: "VYSNER", template: "%s · VYSNER" },
  description: "VYSNER TeamGrid – Projekte, Offene Punkte und Mängel für Bau-, Service- und Projektteams.",
  icons: { icon: "/brand/vysner-icon.png", apple: "/brand/vysner-tile.png" },
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "https://vysner.com", siteName: "VYSNER", title: "VYSNER TeamGrid – Jedes Projekt im Griff", images: ["/landing/tg-uebersicht.jpg"] }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1226"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
