import type { Metadata } from "next";
import { BLOMOON_CANONICAL_ORIGIN } from "@/lib/app-config/public";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BLOMOON_CANONICAL_ORIGIN),
  title: "Blomoon",
  description: "Explore live entertainment streams on a focused interactive globe."
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
