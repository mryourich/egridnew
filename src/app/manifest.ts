import type { MetadataRoute } from "next";

/** Lets VYSNER be installed on the phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VYSNER",
    short_name: "VYSNER",
    description: "Baustellenmanagement für Bauleitung und Monteure",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0b1530",
    theme_color: "#0b1530",
    lang: "de",
    icons: [
      { src: "/brand/vysner-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/vysner-tile.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
