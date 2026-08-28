import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blomoon",
    short_name: "Blomoon",
    description: "Discover and play live entertainment streams by geography on Blomoon's interactive globe.",
    start_url: "/",
    display: "standalone",
    background_color: "#050708",
    theme_color: "#050708",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
