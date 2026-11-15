import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    // "/" bounces through the locale proxy to the right /{lang} home.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07130c",
    theme_color: "#0b3d2e",
    lang: "en",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Favorites",
        url: "/en/favorites",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Search stations",
        url: "/en/search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Simple mode",
        url: "/en/simple",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile.png",
        sizes: "804x1748",
        type: "image/png",
        form_factor: "narrow",
        label: "Elanjai FM on a phone",
      },
      {
        src: "/screenshots/desktop.png",
        sizes: "2160x1536",
        type: "image/png",
        form_factor: "wide",
        label: "Elanjai FM on desktop",
      },
    ],
  };
}
