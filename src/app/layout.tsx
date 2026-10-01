import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vysner.com"),
  title: { default: "VYSNER", template: "%s · VYSNER" },
  description: "Baustellenmanagement für Bauleitung und Monteure: Plan, Mängel, Fotos und Tagesberichte.",
  icons: { icon: "/brand/vysner-icon.png", apple: "/brand/vysner-tile.png" },
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "https://vysner.com", siteName: "VYSNER", title: "VYSNER – Baustellen im Griff", images: ["/landing/plan.jpg"] }
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
