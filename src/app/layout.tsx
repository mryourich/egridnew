import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VYSNERTECH", template: "%s · VYSNERTECH" },
  description: "Baustellenmanagement für Bauleitung und Monteure: Plan, Mängel, Fotos und Tagesberichte.",
  icons: { icon: "/brand/vysner-icon.png", apple: "/brand/vysner-tile.png" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1733"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
