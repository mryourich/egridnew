import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VYSNER", template: "%s · VYSNER" },
  description: "Baustellenmanagement für Bauleitung und Monteure: Plan, Mängel, Fotos und Tagesberichte.",
  icons: { icon: "/brand/vysner-icon.png", apple: "/brand/vysner-tile.png" }
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
