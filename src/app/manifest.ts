import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blomoon",
    short_name: "Blomoon",
    description: "Discover and play live entertainment streams by geography on Blomoon's interactive globe.",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#050509",
    theme_color: "#050509",
    icons: [
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      }
    ]
  };
}
