import type { Metadata } from "next";
import { BLOMOON_CANONICAL_ORIGIN } from "@/lib/app-config/public";
import "./globals.css";

const description = "Discover and play live entertainment streams by geography on Blomoon's interactive globe.";

export const metadata: Metadata = {
  metadataBase: new URL(BLOMOON_CANONICAL_ORIGIN),
  title: {
    default: "Blomoon",
    template: "%s | Blomoon"
  },
  description,
  applicationName: "Blomoon",
  appleWebApp: {
    capable: true,
    title: "Blomoon"
  },
  openGraph: {
    title: "Blomoon",
    description,
    siteName: "Blomoon",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Blomoon",
    description
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
